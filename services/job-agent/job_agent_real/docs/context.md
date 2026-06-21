# Job Agent — Project Context

## Problem Statement

Job seekers today must manually visit multiple job portals — **Naukri**, **RemoteOK**, and **Wellfound** (formerly AngelList) — to find relevant openings for a specific role or title. This is repetitive, time-consuming, and error-prone. There is no single tool that aggregates listings from all three platforms into one unified, searchable output.

**This project solves that problem** by building a **Job Agent** — a Python-based automation tool that:

1. Accepts a **job title or natural language query** (e.g. `"Software Engineer"`, `"Data Scientist"`, or `"find product manager roles in Bengaluru"`). A built-in search parser automatically extracts the target job title/keyword (e.g., `"product manager"`) and location (e.g., `"Bengaluru"`) from the query.
2. Searches all three platforms for matching listings. For Naukri, it maps location searches to the exact location-based URL patterns (e.g., `https://www.naukri.com/product-manager-jobs-in-bengaluru?k=product%20manager&l=bengaluru`) for maximum accuracy.
3. Normalizes the results into a **common schema**.
4. Exports all collected jobs into a single **CSV file** for easy review, filtering, and sharing.

---

## Target Platforms

### 1. RemoteOK (`https://remoteok.com`)

- **Data Access:** Public JSON API at `https://remoteok.com/api` — no authentication required.
- **Strategy:** Direct HTTP GET request; parse JSON response; filter by job title keyword.
- **Data Available:** Job title, company, location (remote), salary range, tags, URL, date posted.
- **Rate Limiting:** Respectful delays between requests; User-Agent header required.

### 2. Naukri (`https://www.naukri.com`)

- **Data Access:** No public API. Job listing pages serve server-rendered HTML that can be parsed directly.
- **Strategy:** Direct **HTML scraping** using `requests` to fetch page HTML and **BeautifulSoup** to parse and extract structured job data from the DOM elements (job cards, listing containers).
- **Data Available:** Job title, company, location, experience required, salary, skills, URL, date posted.
- **Challenges:**
  - Anti-bot protections (CAPTCHAs, rate limiting, IP bans).
  - Pagination handling across multiple result pages.
  - Frequent DOM structure changes.
- **Mitigations:** Realistic User-Agent and headers, configurable delays between requests, retry logic with exponential backoff.

### 3. Wellfound (`https://wellfound.com`)

- **Data Access:** No public API. The site uses heavy anti-scraping protection (DataDome). Direct scraping is fragile.
- **Strategy:** Use **Firecrawl** (`firecrawl-py` SDK) — a managed scraping API that handles anti-bot bypasses, JavaScript rendering, and returns clean structured data (Markdown or JSON). We call `scrape_url()` or `crawl_url()` on Wellfound job listing pages and extract job data from the structured response.
- **Data Available:** Job title, company, location, role type, equity, salary range, URL, date posted.
- **Requirements:**
  - Firecrawl API key (set via `FIRECRAWL_API_KEY` env variable or passed directly).
  - `firecrawl-py` Python SDK (`pip install firecrawl-py`).
- **Advantages:**
  - Bypasses DataDome and other anti-bot measures automatically.
  - Handles JavaScript rendering server-side — no local browser needed.
  - Returns clean Markdown/JSON, reducing brittle DOM parsing.
  - Built-in retry and rate limiting on the API side.

---

## Unified Data Schema (CSV Output)

All scraped jobs will be normalized to this common schema before writing to CSV:

| Column           | Type     | Description                                      |
|------------------|----------|--------------------------------------------------|
| `job_title`      | string   | Title of the job posting                         |
| `company`        | string   | Hiring company name                              |
| `location`       | string   | Job location or "Remote"                         |
| `salary`         | string   | Salary range (if available, else empty)          |
| `experience`     | string   | Required experience (if available, else empty)   |
| `skills`         | string   | Comma-separated required skills                  |
| `job_url`        | string   | Direct link to the job posting                   |
| `source`         | string   | Platform name: "Naukri", "RemoteOK", "Wellfound" |
| `date_posted`    | string   | Posting date (ISO 8601 or platform format)       |
| `date_scraped`   | string   | Timestamp when the job was scraped               |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Job Agent (CLI)                   │
│                                                     │
│  Input: Job role & Location (e.g., "find python     │
│         developer roles in Hyderabad")              │
│                                                     │
│  ┌───────────────────────────────────────────────┐   │
│  │              Scraper Orchestrator              │   │
│  │                                               │   │
│  │  ┌─────────────┐ ┌──────────┐ ┌────────────┐ │   │
│  │  │   Naukri     │ │ RemoteOK │ │  Wellfound │ │   │
│  │  │  Scraper     │ │  Scraper │ │   Scraper  │ │   │
│  │  │(HTML/BS4/Play)│ │  (API)   │ │ (Firecrawl)│ │   │
│  │  └──────┬──────┘ └────┬─────┘ └─────┬──────┘ │   │
│  │         │              │              │        │   │
│  │         ▼              ▼              ▼        │   │
│  │  ┌───────────────────────────────────────────┐ │   │
│  │  │           Data Normalizer                 │ │   │
│  │  │  (Unified schema mapping per platform)    │ │   │
│  │  └──────────────────┬────────────────────────┘ │   │
│  │                     │                          │   │
│  │                     ▼                          │   │
│  │  ┌───────────────────────────────────────────┐ │   │
│  │  │           CSV Exporter                    │ │   │
│  │  │  (Writes/appends to output CSV file)      │ │   │
│  │  └───────────────────────────────────────────┘ │   │
│  └───────────────────────────────────────────────┘   │
│                                                     │
│  Output: jobs_<query>_<timestamp>.csv                │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component             | Technology                          |
|-----------------------|-------------------------------------|
| Language              | Python 3.10+                        |
| HTTP Client           | `requests`                          |
| HTML Parsing          | `beautifulsoup4` + `lxml`           |
| Managed Scraping      | `firecrawl-py` (Firecrawl SDK)     |
| CSV Writing           | Python `csv` module (stdlib)        |
| CLI Interface         | `argparse` or `click`               |
| Configuration         | `.env` file + `python-dotenv`       |
| Logging               | Python `logging` module (stdlib)    |

---

## Project Structure (Planned)

```
job-agent-real/
├── docs/
│   └── context.md              # This file — project context & decisions
├── src/
│   ├── __init__.py
│   ├── main.py                 # CLI entry point
│   ├── config.py               # Settings, constants, env loading
│   ├── orchestrator.py         # Runs all scrapers, collects results
│   ├── scrapers/
│   │   ├── __init__.py
│   │   ├── base.py             # Abstract base scraper class
│   │   ├── naukri.py           # Naukri scraper (HTML + BeautifulSoup)
│   │   ├── remoteok.py         # RemoteOK scraper (Public JSON API)
│   │   └── wellfound.py       # Wellfound scraper (Firecrawl API)
│   ├── models/
│   │   ├── __init__.py
│   │   └── job.py              # Job dataclass (unified schema)
│   └── exporters/
│       ├── __init__.py
│       └── csv_exporter.py     # CSV writer
├── output/                     # Generated CSV files land here
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

---

## Key Design Decisions

1. **Scraper isolation:** Each platform gets its own scraper class inheriting from a common base. This makes it easy to add/remove platforms without affecting others.

2. **Fail-safe execution:** If one scraper fails (e.g. Naukri blocks us), the others still run and results are saved. Errors are logged, not thrown.

3. **Configurable delays:** All scrapers use configurable request delays to be respectful to target servers and reduce ban risk.

4. **No database (MVP):** For the first version, CSV is the sole output. A database layer can be added later if needed.

5. **Right tool for each platform:** Naukri uses lightweight HTML scraping (no browser overhead), RemoteOK uses its public API (simplest and most reliable), and Wellfound uses Firecrawl to handle its heavy anti-bot protections without managing browser automation ourselves.

---

## Ethical & Legal Considerations

- All scraping targets **publicly available** job listing data only.
- No personal data (recruiter emails, phone numbers) is collected.
- Request rates are kept **respectful** with configurable delays.
- The tool is intended for **personal job search use** only.
- Users should review each platform's Terms of Service before use.
- `robots.txt` of each site will be checked and respected where possible.

---

## Success Criteria

- [ ] User can run the agent with a job title and get a CSV file with results.
- [ ] RemoteOK scraper returns valid job listings via API.
- [ ] Naukri scraper returns valid job listings via HTML scraping.
- [ ] Wellfound scraper returns valid job listings via Firecrawl API.
- [ ] All results follow the unified schema with no missing required fields.
- [ ] Errors from individual scrapers are logged but don't crash the agent.
- [ ] CSV output is properly formatted and opens correctly in Excel/Sheets.
