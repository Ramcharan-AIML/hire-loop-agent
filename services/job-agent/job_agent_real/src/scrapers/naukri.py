"""
Naukri Scraper — fetches job listings from naukri.com.

Strategy (ordered by reliability):
  1. OVERRIDE: Local HTML file (if NAUKRI_LOCAL_HTML env variable is set and file exists).
     This is 100% reliable as it bypasses all anti-bot protection manually.
  2. PRIMARY: Use Firecrawl SDK (if API key available) to scrape the search page.
  3. ROBUST FALLBACK: Use Playwright Browser Automation locally.
     This spins up a browser, waits for dynamic JS rendering, and scrapes listings.
  4. INTERNAL JSON API: Hit /jobapi/v3/search with curl_cffi browser TLS impersonation.
  5. LAST RESORT: Direct HTML scraping with requests + BeautifulSoup.

The scraper degrades gracefully through each strategy.
"""

import os
import re
import json
import time
import requests
from urllib.parse import quote_plus
from bs4 import BeautifulSoup

from src.scrapers.base import BaseScraper
from src.models.job import Job
from src import config


class NaukriScraper(BaseScraper):
    """Scrapes job listings from Naukri.com."""

    name = "Naukri"

    # ── Internal JSON API endpoint ──
    API_BASE_URL = "https://www.naukri.com/jobapi/v3/search"

    # Headers required by the internal API (mimics the Naukri web app)
    API_HEADERS = {
        "appid": "109",
        "systemid": "Naukri",
        "User-Agent": config.USER_AGENT,
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.naukri.com/",
        "Connection": "keep-alive",
    }

    # ── HTML search page base ──
    HTML_BASE_URL = "https://www.naukri.com"

    def __init__(self):
        super().__init__()
        self.pages = config.NAUKRI_PAGES

    def scrape(self, job_title_or_query: str) -> list[Job]:
        """
        Scrape Naukri for jobs matching the given title or natural query.

        Degrades gracefully across several strategies:
          1. Local HTML Override (if env variable is set)
          2. Firecrawl API (if key is set)
          3. Playwright browser automation (if library is installed)
          4. Internal JSON API
          5. HTML scraping fallback
        """
        from src.utils.query_parser import parse_search_query
        job_title, location = parse_search_query(job_title_or_query)
        
        if location:
            self.logger.info(f"Parsed Query — Keyword: '{job_title}', Location: '{location}'")
        else:
            self.logger.info(f"Parsed Query — Keyword: '{job_title}' (No location specified)")

        # Strategy 1: Local HTML File Override
        local_html = os.getenv("NAUKRI_LOCAL_HTML")
        if local_html:
            self.logger.info(f"Strategy 1 (Override): Trying Local HTML file: {local_html}")
            if os.path.exists(local_html):
                jobs = self._scrape_via_local_html(local_html)
                if jobs:
                    self.logger.info(f"Local HTML parsing returned {len(jobs)} jobs")
                    return jobs
                self.logger.warning("Local HTML parsing returned no jobs")
            else:
                self.logger.error(f"Local HTML file does not exist: {local_html}")

        # Strategy 2: Firecrawl (if API key is configured)
        if config.FIRECRAWL_API_KEY and config.FIRECRAWL_API_KEY != "fc-your-api-key-here":
            self.logger.info("Strategy 2: Trying Firecrawl approach...")
            jobs = self._scrape_via_firecrawl(job_title, location)
            if jobs:
                self.logger.info(f"Firecrawl returned {len(jobs)} jobs")
                return jobs
            self.logger.warning("Firecrawl returned no results")

        # Strategy 3: Playwright Browser Automation
        self.logger.info("Strategy 3: Trying Playwright browser automation...")
        jobs = self._scrape_via_playwright(job_title, location)
        if jobs:
            self.logger.info(f"Playwright returned {len(jobs)} jobs")
            return jobs
        self.logger.warning("Playwright strategy returned no results or is not installed")

        # Strategy 4: Internal JSON API (may fail due to Akamai/reCAPTCHA)
        self.logger.info("Strategy 4: Trying JSON API approach...")
        jobs = self._scrape_via_api(job_title, location)
        if jobs:
            self.logger.info(f"JSON API returned {len(jobs)} jobs")
            return jobs

        # Strategy 5: HTML scraping (last resort — Naukri is a JS SPA)
        self.logger.warning("JSON API failed — trying HTML scraping as last resort")
        jobs = self._scrape_via_html(job_title, location)
        self.logger.info(f"HTML scraping returned {len(jobs)} jobs")
        return jobs
    def _scrape_via_local_html(self, file_path: str) -> list[Job]:
        """Parse job listings from a locally saved HTML file."""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                html = f.read()

            # First try parsing as RSC Next.js payload
            jobs = self._parse_rsc_payload(html)
            if jobs:
                return jobs

            # Then fallback to BeautifulSoup DOM parsing
            soup = BeautifulSoup(html, "lxml")
            return self._parse_html_jobs(soup)
        except Exception as e:
            self.logger.error(f"Failed to parse local HTML file: {e}")
            return []

    def _scrape_via_playwright(self, job_title: str, location: str = None) -> list[Job]:
        """
        Use Playwright to dynamically load Naukri search pages,
        wait for the React/JS job cards to render, and then parse the DOM.
        """
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            self.logger.warning("playwright not installed — skipping Playwright strategy")
            return []

        all_jobs: list[Job] = []
        slug = job_title.lower().replace(" ", "-")

        # Headless mode can be set to True via env, but False is heavily recommended for Naukri
        headless_str = os.getenv("PLAYWRIGHT_HEADLESS", "false")
        headless = headless_str.lower() == "true"

        try:
            with sync_playwright() as p:
                self.logger.info(f"Launching Playwright browser (headless={headless})...")
                
                # Exclude default automation indicator flags so Akamai is less suspicious
                browser = p.chromium.launch(
                    headless=headless,
                    args=["--disable-blink-features=AutomationControlled"]
                )
                
                # Context with realistic desktop viewport and User-Agent
                context = browser.new_context(
                    user_agent=config.USER_AGENT,
                    viewport={"width": 1280, "height": 800}
                )
                page = context.new_page()

                # Anti-bot bypass: override navigator.webdriver property
                page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

                for page_num in range(1, self.pages + 1):
                    if location:
                        loc_slug = location.lower().replace(" ", "-")
                        url = f"{self.HTML_BASE_URL}/{slug}-jobs-in-{loc_slug}"
                        if page_num > 1:
                            url = f"{url}-{page_num}"
                        url += f"?k={quote_plus(job_title)}&l={quote_plus(location)}"
                    else:
                        url = f"{self.HTML_BASE_URL}/{slug}-jobs"
                        if page_num > 1:
                            url = f"{url}-{page_num}"
                        url += f"?k={quote_plus(job_title)}"

                    self.logger.info(f"Playwright loading page {page_num}: {url}")
                    
                    # Go to URL and wait until the DOM is loaded
                    page.goto(url, wait_until="domcontentloaded", timeout=30000)
                    
                    # Let the page render for a brief moment
                    page.wait_for_timeout(2000)

                    # Dynamic Bot Protection Detection
                    title = page.title()
                    content = page.content().lower()
                    if "access denied" in title.lower() or "recaptcha" in content or "robot" in content or "unusual activity" in content:
                        self.logger.warning("⚠️ Naukri bot protection / challenge page detected!")
                        if not headless:
                            self.logger.info("Please solve the verification challenge / CAPTCHA in the open browser window...")
                            # Wait up to 60 seconds for the jobs DOM to appear
                            try:
                                page.wait_for_selector("article, .srp-jobtuple, .cust-job-tuple", timeout=60000)
                                self.logger.info("✅ Challenge solved! Continuing extraction...")
                            except Exception:
                                self.logger.error("❌ Timeout waiting for verification challenge to be solved.")
                        else:
                            self.logger.error("❌ Heading is blocked by bot protection. Try running with PLAYWRIGHT_HEADLESS=False.")

                    # Wait for job container or job cards to render
                    self.logger.debug("Waiting for job listings to render...")
                    try:
                        page.wait_for_selector("article, .srp-jobtuple, .cust-job-tuple", timeout=15000)
                    except Exception:
                        self.logger.warning("Timeout waiting for job cards, waiting 5s for fallback...")
                        page.wait_for_timeout(5000)

                    # Retrieve the fully rendered HTML DOM
                    html = page.content()
                    
                    # Check if there is data inside Next.js RSC payload first (very robust)
                    page_jobs = self._parse_rsc_payload(html)
                    
                    # Fallback to DOM BeautifulSoup parser if RSC is empty
                    if not page_jobs:
                        soup = BeautifulSoup(html, "lxml")
                        page_jobs = self._parse_html_jobs(soup)
                    
                    if page_jobs:
                        self.logger.info(f"Playwright page {page_num}: Found {len(page_jobs)} jobs")
                        all_jobs.extend(page_jobs)
                    else:
                        self.logger.warning(f"Playwright page {page_num}: No jobs found in rendered HTML")
                        # Save screenshot & HTML for troubleshooting
                        try:
                            config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
                            debug_html_path = config.OUTPUT_DIR / f"naukri_debug_page_{page_num}.html"
                            with open(debug_html_path, "w", encoding="utf-8") as f:
                                f.write(html)
                            self.logger.debug(f"Saved debug HTML to {debug_html_path}")
                            
                            debug_img_path = config.OUTPUT_DIR / f"naukri_debug_page_{page_num}.png"
                            page.screenshot(path=str(debug_img_path))
                            self.logger.debug(f"Saved debug screenshot to {debug_img_path}")
                        except Exception as debug_err:
                            self.logger.debug(f"Failed to write debug diagnostics: {debug_err}")

                    if page_num < self.pages:
                        self.wait()

                browser.close()
                return all_jobs

        except Exception as e:
            self.logger.error(f"Playwright scraping failed: {e}")
            return []


    # ──────────────────────────────────────────────
    # Strategy 1: Firecrawl SDK
    # ──────────────────────────────────────────────

    def _scrape_via_firecrawl(self, job_title: str, location: str = None) -> list[Job]:
        """
        Use Firecrawl to scrape Naukri search results.

        Firecrawl renders JavaScript server-side and returns clean
        Markdown/JSON, bypassing anti-bot measures.
        """
        try:
            from firecrawl import Firecrawl
        except ImportError:
            try:
                from firecrawl import FirecrawlApp as Firecrawl
            except ImportError:
                self.logger.warning("firecrawl-py not installed — skipping Firecrawl strategy")
                return []

        try:
            app = Firecrawl(api_key=config.FIRECRAWL_API_KEY)
            all_jobs: list[Job] = []

            for page_num in range(1, self.pages + 1):
                slug = job_title.lower().replace(" ", "-")
                if location:
                    loc_slug = location.lower().replace(" ", "-")
                    url = f"https://www.naukri.com/{slug}-jobs-in-{loc_slug}"
                    if page_num > 1:
                        url = f"{url}-{page_num}"
                    url += f"?k={quote_plus(job_title)}&l={quote_plus(location)}"
                else:
                    url = f"https://www.naukri.com/{slug}-jobs"
                    if page_num > 1:
                        url = f"{url}-{page_num}"
                    url += f"?k={quote_plus(job_title)}"

                self.logger.debug(f"Firecrawl scraping page {page_num}: {url}")

                # Use scrape if available, otherwise fallback to scrape_url
                if hasattr(app, "scrape"):
                    result = app.scrape(url, formats=["markdown"], wait_for=5000)
                elif hasattr(app, "scrape_url"):
                    try:
                        result = app.scrape_url(url, formats=["markdown"], wait_for=5000)
                    except TypeError:
                        result = app.scrape_url(url, params={"formats": ["markdown"], "waitFor": 5000})
                else:
                    self.logger.error("Neither scrape nor scrape_url method found on Firecrawl client.")
                    continue

                # Extract markdown safely
                if hasattr(result, "markdown"):
                    markdown = result.markdown
                elif isinstance(result, dict):
                    markdown = result.get("markdown", "")
                else:
                    markdown = getattr(result, "markdown", "")

                if not markdown:
                    self.logger.debug(f"No markdown content from Firecrawl for page {page_num}")
                    continue

                page_jobs = self._parse_firecrawl_markdown(markdown)
                all_jobs.extend(page_jobs)

                self.logger.debug(f"Firecrawl page {page_num}: {len(page_jobs)} jobs")

                if page_num < self.pages:
                    self.wait()

            return all_jobs

        except Exception as e:
            self.logger.error(f"Firecrawl scraping failed: {e}")
            return []

    def _parse_firecrawl_markdown(self, markdown: str) -> list[Job]:
        """
        Parse job listings from Firecrawl's Markdown output.

        Naukri job cards in Markdown typically appear as structured blocks
        with title, company, location, experience, salary, and skills.
        """
        jobs: list[Job] = []

        # Split by common job card separators in rendered Markdown
        # Naukri job cards often appear as blocks separated by --- or ### headers
        # Pattern: look for linked titles followed by company info
        # Example Markdown pattern from Naukri:
        #   ### [Job Title](url)
        #   Company Name
        #   Location | Experience | Salary
        #   Skills: Python, Django, ...

        # Try splitting by horizontal rules or repeated patterns
        blocks = re.split(r'\n(?=#{1,3}\s|\*\*\[|\[\*\*)', markdown)

        for block in blocks:
            job = self._parse_markdown_block(block)
            if job:
                jobs.append(job)

        # If block-based parsing didn't work, try line-by-line extraction
        if not jobs:
            jobs = self._parse_markdown_lines(markdown)

        return jobs

    def _parse_markdown_block(self, block: str) -> Job | None:
        """Parse a single job block from Markdown."""
        try:
            lines = [l.strip() for l in block.strip().split("\n") if l.strip()]
            if not lines:
                return None

            # Look for title (usually a link)
            title = ""
            job_url = ""
            title_line = None
            for line in lines:
                link_match = re.search(r'\[([^\]]+)\]\(([^)]+)\)', line)
                if link_match:
                    title = link_match.group(1).strip()
                    job_url = link_match.group(2).strip()
                    # Clean up markdown formatting from title
                    title = re.sub(r'[*#\[\]]', '', title).strip()
                    title_line = line  # remember it so we don't reuse it as company
                    break

            if not title or len(title) < 3:
                return None

            # Skip markdown image links (e.g. "![Naukri Logo](...)" parsed as a title).
            if title_line is not None and "![" in title_line:
                return None

            # Skip non-job links (navigation, footer, etc.)
            if any(skip in title.lower() for skip in ["login", "register", "home", "about", "contact", "privacy", "logo"]):
                return None

            # Extract other fields from remaining lines
            company = ""
            location = ""
            experience = ""
            salary = ""
            skills = ""

            for line in lines:
                # Never reuse the title's own link line as the company.
                if title_line is not None and line == title_line:
                    continue

                clean_line = re.sub(r'[*#]', '', line).strip()
                # Collapse any markdown links [text](url) down to just their text.
                clean_line = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', clean_line).strip()

                # Company name (often the line right after the title)
                if not company and clean_line and clean_line != title:
                    # Skip leftover URLs/link fragments and metadata lines.
                    if clean_line.lower().startswith("http") or "](" in clean_line:
                        pass
                    elif not any(c in clean_line.lower() for c in ["experience", "salary", "skill", "location", "₹", "lpa", "yrs"]):
                        company = clean_line

                # Experience
                exp_match = re.search(r'(\d+[-–]\d+\s*(?:yrs?|years?))', clean_line, re.I)
                if exp_match:
                    experience = exp_match.group(1)

                # Salary
                sal_match = re.search(r'(₹[^|]+|[\d.]+\s*-\s*[\d.]+\s*(?:lpa|lakhs?|L))', clean_line, re.I)
                if sal_match:
                    salary = sal_match.group(1).strip()

                # Location (city names often appear with | separators)
                loc_match = re.search(r'(?:bangalore|bengaluru|mumbai|delhi|hyderabad|pune|chennai|kolkata|noida|gurgaon|gurugram|remote|india)', clean_line, re.I)
                if loc_match and not location:
                    location = loc_match.group(0).strip()

                # Skills
                if "skills" in clean_line.lower() or "tags" in clean_line.lower():
                    skills = re.sub(r'(?:skills?|tags?)\s*:?\s*', '', clean_line, flags=re.I).strip()

            return Job.create(
                job_title=title,
                company=company or "Unknown",
                location=location,
                source="Naukri",
                job_url=job_url,
                salary=salary,
                experience=experience,
                skills=skills,
            )

        except Exception as e:
            self.logger.debug(f"Failed to parse Markdown block: {e}")
            return None

    def _parse_markdown_lines(self, markdown: str) -> list[Job]:
        """
        Line-by-line fallback parser for Firecrawl Markdown.

        Looks for patterns of linked titles followed by metadata.
        """
        jobs: list[Job] = []
        lines = markdown.split("\n")

        i = 0
        while i < len(lines):
            line = lines[i].strip()

            # Look for a link that could be a job title
            link_match = re.search(r'\[([^\]]{5,})\]\((https?://[^)]*naukri[^)]*)\)', line)
            if link_match:
                title = re.sub(r'[*#]', '', link_match.group(1)).strip()
                url = link_match.group(2)

                # Skip navigation/footer links
                if not any(skip in title.lower() for skip in ["login", "register", "home", "search", "browse"]):
                    # Gather context from surrounding lines
                    context = "\n".join(lines[max(0, i-1):min(len(lines), i+6)])
                    company = ""
                    location = ""
                    experience = ""
                    salary = ""

                    # Try next few lines for metadata
                    for j in range(i+1, min(i+6, len(lines))):
                        ctx = lines[j].strip()
                        if not company and ctx and not re.search(r'\d+[-–]\d+', ctx):
                            # Collapse markdown links to text, then drop leftover URL fragments.
                            cand = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', ctx)
                            cand = re.sub(r'[*#\[\]]', '', cand).strip()
                            if cand and not cand.lower().startswith("http") and "](" not in cand:
                                company = cand
                        exp_m = re.search(r'(\d+[-–]\d+\s*(?:yrs?|years?))', ctx, re.I)
                        if exp_m:
                            experience = exp_m.group(1)
                        sal_m = re.search(r'(₹[^|,\n]+|[\d.]+\s*-\s*[\d.]+\s*(?:lpa|L))', ctx, re.I)
                        if sal_m:
                            salary = sal_m.group(1).strip()
                        loc_m = re.search(r'(bangalore|bengaluru|mumbai|delhi|hyderabad|pune|chennai|kolkata|noida|gurgaon|gurugram|remote)', ctx, re.I)
                        if loc_m and not location:
                            location = loc_m.group(0)

                    if title and len(title) > 5:
                        jobs.append(Job.create(
                            job_title=title,
                            company=company or "Unknown",
                            location=location,
                            source="Naukri",
                            job_url=url,
                            salary=salary,
                            experience=experience,
                        ))
            i += 1

        return jobs

    # ──────────────────────────────────────────────
    # Strategy 2: Internal JSON API
    # ──────────────────────────────────────────────

    def _scrape_via_api(self, job_title: str, location: str = None) -> list[Job]:
        """
        Fetch jobs from Naukri's internal JSON API.

        Note: This often returns 406 (recaptcha required) due to
        Akamai Bot Manager protection. Works when valid session
        cookies are available.
        """
        all_jobs: list[Job] = []

        try:
            # Try curl_cffi with browser impersonation for better success rate
            from curl_cffi import requests as cffi_requests
            session = cffi_requests.Session(impersonate="chrome")
            use_cffi = True
        except ImportError:
            session = requests.Session()
            use_cffi = False

        # Warm up with homepage visit to get cookies
        try:
            session.get("https://www.naukri.com/", timeout=10)
            time.sleep(1)
        except Exception:
            pass

        for page_num in range(1, self.pages + 1):
            try:
                jobs_on_page = self._fetch_api_page(session, job_title, page_num, location)
                all_jobs.extend(jobs_on_page)

                self.logger.debug(
                    f"API page {page_num}/{self.pages}: {len(jobs_on_page)} jobs"
                )

                if page_num < self.pages:
                    self.wait()

            except Exception as e:
                self.logger.debug(f"API request failed on page {page_num}: {e}")
                break

        return all_jobs

    def _fetch_api_page(self, session, job_title: str, page_num: int, location: str = None) -> list[Job]:
        """Fetch a single page of results from the Naukri JSON API."""
        slug = job_title.lower().replace(" ", "-")
        if location:
            loc_slug = location.lower().replace(" ", "-")
            seo_key = f"{slug}-jobs-in-{loc_slug}"
            referer = f"https://www.naukri.com/{slug}-jobs-in-{loc_slug}?k={quote_plus(job_title)}&l={quote_plus(location)}"
        else:
            seo_key = f"{slug}-jobs"
            referer = f"https://www.naukri.com/{slug}-jobs?k={quote_plus(job_title)}"

        params = {
            "noOfResults": "20",
            "urlType": "search_by_keyword",
            "searchType": "adv",
            "keyword": job_title,
            "pageNo": str(page_num),
            "k": job_title,
            "seoKey": seo_key,
            "src": "jobsearchDesk",
        }
        if location:
            params["location"] = location
            params["l"] = location

        api_headers = {
            **self.API_HEADERS,
            "Referer": referer,
        }

        response = session.get(
            self.API_BASE_URL,
            params=params,
            headers=api_headers,
            timeout=15,
        )

        if response.status_code != 200:
            self.logger.debug(f"API returned status {response.status_code}")
            return []

        data = response.json()
        job_details = data.get("jobDetails", [])

        if not job_details:
            return []

        jobs = []
        for job_data in job_details:
            job = self._parse_api_job(job_data)
            if job:
                jobs.append(job)
        return jobs

    def _parse_api_job(self, job_data: dict) -> Job | None:
        """
        Parse a single job object from the Naukri JSON API response.

        Returns None if required fields are missing.
        """
        try:
            title = job_data.get("title", "").strip()
            company = job_data.get("companyName", "").strip()
            jd_url = job_data.get("jdURL", "")

            if not title or not company:
                return None

            # Build full URL
            if jd_url and not jd_url.startswith("http"):
                jd_url = f"https://www.naukri.com{jd_url}"

            # Extract placeholders (experience, salary, location)
            placeholders = job_data.get("placeholders", [])
            experience = ""
            salary = ""
            location = ""

            for ph in placeholders:
                ph_type = ph.get("type", "").lower()
                ph_label = ph.get("label", "").strip()
                if ph_type == "experience":
                    experience = ph_label
                elif ph_type == "salary":
                    salary = ph_label
                elif ph_type == "location":
                    location = ph_label

            # Skills
            skills_raw = job_data.get("tagsAndSkills", "")
            if isinstance(skills_raw, list):
                skills = ", ".join(skills_raw)
            else:
                skills = skills_raw.strip()

            # Date posted
            created_date = job_data.get("createdDate", "")
            if isinstance(created_date, (int, float)):
                from datetime import datetime
                created_date = datetime.fromtimestamp(created_date).strftime("%Y-%m-%d")

            return Job.create(
                job_title=title,
                company=company,
                location=location,
                source="Naukri",
                job_url=jd_url,
                salary=salary,
                experience=experience,
                skills=skills,
                date_posted=str(created_date),
            )

        except Exception as e:
            self.logger.debug(f"Failed to parse API job entry: {e}")
            return None

    # ──────────────────────────────────────────────
    # Strategy 3: HTML Scraping (Last Resort)
    # ──────────────────────────────────────────────

    def _scrape_via_html(self, job_title: str, location: str = None) -> list[Job]:
        """
        Scrape jobs by fetching HTML search result pages and parsing with BeautifulSoup.

        Note: Naukri is a fully client-side rendered SPA — this approach
        typically returns 0 results unless Naukri changes to server-side
        rendering. Kept as a fallback in case the site structure changes.
        """
        all_jobs: list[Job] = []

        for page_num in range(1, self.pages + 1):
            try:
                jobs_on_page = self._fetch_html_page(job_title, page_num, location)
                all_jobs.extend(jobs_on_page)

                self.logger.debug(
                    f"HTML page {page_num}/{self.pages}: {len(jobs_on_page)} jobs"
                )

                if page_num < self.pages:
                    self.wait()

            except requests.RequestException as e:
                self.logger.error(f"HTML request failed on page {page_num}: {e}")
                break

        return all_jobs

    def _fetch_html_page(self, job_title: str, page_num: int, location: str = None) -> list[Job]:
        """Fetch and parse a single HTML search results page."""
        slug = job_title.lower().replace(" ", "-")
        if location:
            loc_slug = location.lower().replace(" ", "-")
            url = f"{self.HTML_BASE_URL}/{slug}-jobs-in-{loc_slug}"
            if page_num > 1:
                url = f"{url}-{page_num}"
            params = {"k": job_title, "l": location}
        else:
            url = f"{self.HTML_BASE_URL}/{slug}-jobs"
            if page_num > 1:
                url = f"{url}-{page_num}"
            params = {"k": job_title}

        response = requests.get(
            url,
            params=params,
            headers=config.DEFAULT_HEADERS,
            timeout=15,
        )
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "lxml")

        # First try to extract data from RSC/Next.js payload
        jobs = self._parse_rsc_payload(response.text)
        if jobs:
            return jobs

        # Fallback to DOM-based extraction
        return self._parse_html_jobs(soup)

    def _parse_rsc_payload(self, html: str) -> list[Job]:
        """
        Try to extract job data from Next.js RSC streaming payload.

        Naukri uses React Server Components — data may be embedded
        in self.__next_f.push() calls in the HTML.
        """
        try:
            rsc_chunks = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)', html, re.S)
            if not rsc_chunks:
                return []

            full_rsc = ""
            for chunk in rsc_chunks:
                try:
                    unescaped = chunk.encode().decode("unicode_escape")
                except Exception:
                    unescaped = chunk.replace('\\"', '"')
                full_rsc += unescaped

            # Look for jobDetails in the concatenated RSC data
            match = re.search(r'"jobDetails"\s*:\s*(\[.+?\])\s*[,}]', full_rsc, re.S)
            if not match:
                return []

            job_details = json.loads(match.group(1))
            if not job_details:
                return []

            jobs = []
            for job_data in job_details:
                job = self._parse_api_job(job_data)
                if job:
                    jobs.append(job)
            return jobs

        except Exception as e:
            self.logger.debug(f"RSC payload parsing failed: {e}")
            return []

    def _parse_html_jobs(self, soup: BeautifulSoup) -> list[Job]:
        """
        Extract job listings from a Naukri search results HTML page.

        Naukri's DOM uses CSS modules with hashed class names that change
        on every build. This method tries multiple selector patterns.
        """
        jobs: list[Job] = []

        # Try multiple known selector patterns
        job_cards = (
            soup.find_all("article", class_=re.compile(r"jobTuple", re.I))
            or soup.find_all("div", class_=re.compile(r"srp-jobtuple", re.I))
            or soup.find_all("div", class_=re.compile(r"cust-job-tuple", re.I))
        )

        # Try generic approach: find container then articles
        if not job_cards:
            container = soup.find("div", id=re.compile(r"listContainer", re.I))
            if container:
                job_cards = container.find_all("article")

        if not job_cards:
            self.logger.debug("No job cards found in HTML DOM")
            return []

        for card in job_cards:
            job = self._parse_html_card(card)
            if job:
                jobs.append(job)

        return jobs

    def _parse_html_card(self, card) -> Job | None:
        """Parse a single job card element from Naukri's HTML."""
        try:
            # Job Title
            title_el = (
                card.find("a", class_=re.compile(r"title", re.I))
                or card.find("a", class_=re.compile(r"jobTitle", re.I))
            )
            title = title_el.get_text(strip=True) if title_el else ""
            job_url = title_el.get("href", "") if title_el else ""

            if not title:
                return None

            if job_url and not job_url.startswith("http"):
                job_url = f"https://www.naukri.com{job_url}"

            # Company Name
            company_el = (
                card.find("a", class_=re.compile(r"comp-name|subTitle|companyName", re.I))
                or card.find("span", class_=re.compile(r"comp-name|companyName", re.I))
            )
            company = company_el.get_text(strip=True) if company_el else "Unknown"

            # Experience
            exp_el = card.find("span", class_=re.compile(r"exp|experience", re.I))
            experience = exp_el.get_text(strip=True) if exp_el else ""

            # Salary
            sal_el = card.find("span", class_=re.compile(r"sal|salary", re.I))
            salary = sal_el.get_text(strip=True) if sal_el else ""

            # Location
            loc_el = card.find("span", class_=re.compile(r"loc|location", re.I))
            location = loc_el.get_text(strip=True) if loc_el else ""

            # Skills
            skills_el = card.find("span", class_=re.compile(r"tag|skill", re.I))
            skills = skills_el.get_text(strip=True) if skills_el else ""

            return Job.create(
                job_title=title,
                company=company,
                location=location,
                source="Naukri",
                job_url=job_url,
                salary=salary,
                experience=experience,
                skills=skills,
            )

        except Exception as e:
            self.logger.debug(f"Failed to parse HTML job card: {e}")
            return None
