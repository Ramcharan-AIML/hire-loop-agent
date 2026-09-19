"""
Job Description Fetcher — retrieves the FULL text of a single job posting.

Search results only carry listing-card metadata (title, company, location,
salary, experience, skills). The actual description lives on the detail page,
which on Naukri is a Next.js RSC shell whose content is hydrated client-side
from an API that returns 406 to non-browser clients. So plain HTTP alone
cannot get it — we need JS rendering or a scraping proxy.

Strategy (ordered by observed reliability):
  1. PRIMARY:  Firecrawl SDK — renders JS and handles anti-bot. Verified
               working against Naukri detail pages.
  2. FALLBACK: Playwright — local headless browser, no API quota.
  3. LAST:     requests/curl_cffi + JSON-LD `JobPosting.description`, which
               some boards (RemoteOK, Wellfound, Greenhouse, Lever) do expose.

Each strategy degrades to the next. Returns "" if all of them fail; callers
are expected to fall back to the card metadata rather than hard-fail.
"""

import json
import logging
import re

from src import config

logger = logging.getLogger("job_agent.job_description")

# A real description is longer than a nav bar or a cookie banner.
MIN_USEFUL_LENGTH = 120

# Naukri renders the description under an H2 and follows it with the company
# boilerplate under the next H2. Everything between is what we want (job
# description + preferred candidate profile + education + key skills).
_JD_HEADING = re.compile(r"^##\s+Job description\s*$", re.M | re.I)
_NEXT_H2 = re.compile(r"^##\s+", re.M)

# Boilerplate that survives main-content extraction on Naukri.
_NOISE_LINES = (
    "read more",
    "skills highlighted with",
    "beware of imposters",
    "naukri.com does not promise a job",
    "continue with google",
    "apply",
    "login",
    "register",
    "search jobs here",
)


def _strip_markdown(md: str) -> str:
    """Flatten markdown to readable plain text for the LLM's JD parser."""
    md = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", md)               # images
    md = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", md)            # links -> label
    md = re.sub(r"\*\*([^*]+)\*\*", r"\1", md)                  # bold
    md = re.sub(r"(?<!\*)\*(?!\*)([^*]+)\*(?!\*)", r"\1", md)   # italics
    md = re.sub(r"^#{1,6}\s*", "", md, flags=re.M)              # heading markers
    md = md.replace("\\", "")

    kept = []
    for line in md.splitlines():
        line = line.rstrip()
        low = line.strip().lower()
        if not low:
            if kept and kept[-1] != "":
                kept.append("")
            continue
        if any(low.startswith(n) or low == n for n in _NOISE_LINES):
            continue
        kept.append(line)

    return re.sub(r"\n{3,}", "\n\n", "\n".join(kept)).strip()


def _extract_jd_section(md: str) -> str:
    """
    Slice the job-description section out of a full-page markdown capture.

    Falls back to the whole page when the expected heading is absent (non-Naukri
    boards), since a noisy description still beats no description.
    """
    match = _JD_HEADING.search(md)
    if not match:
        return md

    start = match.start()
    nxt = _NEXT_H2.search(md, match.end())
    return md[start : nxt.start()] if nxt else md[start:]


# ──────────────────────────────────────────────
# Strategy 1: Firecrawl
# ──────────────────────────────────────────────
def _via_firecrawl(url: str) -> str:
    if not config.FIRECRAWL_API_KEY:
        logger.debug("Firecrawl skipped: no API key configured.")
        return ""

    try:
        from firecrawl import Firecrawl

        client = Firecrawl(api_key=config.FIRECRAWL_API_KEY)
        result = client.scrape(
            url, formats=["markdown"], only_main_content=True, timeout=90000
        )
        markdown = getattr(result, "markdown", None)
        if markdown is None and isinstance(result, dict):
            markdown = result.get("markdown", "")

        return _strip_markdown(_extract_jd_section(markdown or ""))
    except Exception as e:
        logger.warning(f"Firecrawl description fetch failed: {e}")
        return ""


# ──────────────────────────────────────────────
# Strategy 2: Playwright
# ──────────────────────────────────────────────
# Detail-page containers, most specific first.
_PW_SELECTORS = (
    "section.styles_job-desc-container__txpYf",
    "div.styles_JDC__dang-inner-html__h0K4t",
    "[class*='job-desc-container']",
    "[class*='dang-inner-html']",
    "section.job-desc",
    "div.jd-desc",
    "#job-description",
    "[class*='job_description']",
    "[data-testid='job-description']",
)


def _via_playwright(url: str) -> str:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        logger.debug("Playwright not installed; skipping.")
        return ""

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=config.PLAYWRIGHT_HEADLESS,
                args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
            )
            context = browser.new_context(
                user_agent=config.USER_AGENT,
                viewport={"width": 1440, "height": 900},
                locale="en-US",
            )
            page = context.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=60000)

            text = ""
            for selector in _PW_SELECTORS:
                try:
                    page.wait_for_selector(selector, timeout=8000)
                    node = page.query_selector(selector)
                    if node:
                        candidate = (node.inner_text() or "").strip()
                        if len(candidate) >= MIN_USEFUL_LENGTH:
                            text = candidate
                            break
                except Exception:
                    continue

            if not text:
                # Last resort within Playwright: the rendered body.
                try:
                    text = (page.inner_text("body") or "").strip()
                except Exception:
                    text = ""

            browser.close()
            return _strip_markdown(text)
    except Exception as e:
        logger.warning(f"Playwright description fetch failed: {e}")
        return ""


# ──────────────────────────────────────────────
# Strategy 3: JSON-LD JobPosting
# ──────────────────────────────────────────────
_LD_BLOCK = re.compile(
    r"<script[^>]*type=[\"']application/ld\+json[\"'][^>]*>(.*?)</script>", re.S
)

_HTML_ENTITIES = (
    ("&amp;", "&"),
    ("&lt;", "<"),
    ("&gt;", ">"),
    ("&quot;", '"'),
    ("&#39;", "'"),
    ("&nbsp;", " "),
)


def _via_jsonld(url: str) -> str:
    try:
        try:
            from curl_cffi import requests as http

            session = http.Session(impersonate="chrome")
        except ImportError:
            import requests as http  # type: ignore

            session = http.Session()
            session.headers.update(config.DEFAULT_HEADERS)

        response = session.get(url, timeout=25)
        if response.status_code != 200:
            logger.debug(f"JSON-LD fetch got status {response.status_code}")
            return ""

        for block in _LD_BLOCK.findall(response.text):
            try:
                data = json.loads(block)
            except Exception:
                continue

            for node in data if isinstance(data, list) else [data]:
                if not isinstance(node, dict) or node.get("@type") != "JobPosting":
                    continue

                # JSON-LD descriptions are HTML fragments.
                raw = node.get("description", "")
                raw = re.sub(r"<br\s*/?>|</p>|</li>", "\n", raw)
                raw = re.sub(r"<li[^>]*>", "- ", raw)
                raw = re.sub(r"<[^>]+>", " ", raw)
                for entity, char in _HTML_ENTITIES:
                    raw = raw.replace(entity, char)

                cleaned = _strip_markdown(raw)
                if len(cleaned) >= MIN_USEFUL_LENGTH:
                    return cleaned
        return ""
    except Exception as e:
        logger.warning(f"JSON-LD description fetch failed: {e}")
        return ""


def fetch_job_description(url: str) -> tuple[str, str]:
    """
    Fetch the full description text for a single job posting URL.

    Returns:
        (description, strategy_name). `description` is "" when every strategy
        failed; `strategy_name` is "none" in that case.
    """
    if not url or not url.startswith("http"):
        return "", "none"

    for name, strategy in (
        ("firecrawl", _via_firecrawl),
        ("playwright", _via_playwright),
        ("jsonld", _via_jsonld),
    ):
        text = strategy(url)
        if text and len(text) >= MIN_USEFUL_LENGTH:
            logger.info(f"Description fetched via {name} ({len(text)} chars) for {url}")
            return text, name
        logger.debug(f"Strategy '{name}' returned {len(text or '')} chars; trying next.")

    logger.error(f"All description strategies failed for {url}")
    return "", "none"
