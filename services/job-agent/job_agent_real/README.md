# Job Agent CLI

An advanced, production-grade Job Aggregator CLI designed to search, scrape, normalize, and export job listings from **Naukri**, **RemoteOK**, and **Wellfound** into a unified, clean CSV schema.

It handles sophisticated bot-mitigation mechanisms (such as Akamai on Naukri and DataDome on Wellfound) using a multi-layered, resilient fallback architecture:
1. **Firecrawl Managed Scraping API** (highly reliable server-side JavaScript execution)
2. **Playwright Browser Automation** (headful/headless browser control with automated challenge bypass controls)
3. **Local Offline HTML parsing** (for manual scraping bypasses)

---

## 📋 Unified CSV Schema

All collected job listings are normalized into a unified schema and exported to `output/` with the following columns:

| Column Name | Description | Example |
| :--- | :--- | :--- |
| `job_title` | The title of the role | `Python Developer` |
| `company` | The hiring company | `Infosys` |
| `location` | Location of the job | `Bengaluru`, `Remote` |
| `salary` | Estimated or provided salary package | `10-15 Lakhs` or `$110k – $190k` |
| `experience` | Required experience range | `3-5 Yrs` |
| `skills` | Relevant tags or required technologies | `Python, Django, AWS` |
| `job_url` | Direct URL to the job listing page | `https://www.naukri.com/job-listings-...` |
| `source` | Platform source | `Naukri`, `RemoteOK`, `Wellfound` |
| `date_posted` | Original date the job was posted | `2026-05-30` |
| `date_scraped` | Timestamp when the job was retrieved | `2026-05-31 18:16:23` |

---

## 🛠️ Setup & Installation

### 1. Prerequisites
Ensure you have **Python 3.10+** installed.

### 2. Install Dependencies
Clone the repository and install the required packages:
```bash
pip install -r requirements.txt
```

### 3. Install Playwright Browsers
To enable the Playwright local fallback engine, run the following:
```bash
playwright install chromium
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory (you can copy `.env.example` as a starting point):
```env
# Firecrawl API key (Get your key at: https://firecrawl.dev)
FIRECRAWL_API_KEY=fc-your-api-key-here

# Crawling settings
REQUEST_DELAY=2
NAUKRI_PAGES=3
LOG_LEVEL=INFO
```

---

## 🚀 Usage Guide

The application is run through `src/main.py`. The scraper accepts both structured queries and natural language statements like *"find python developer roles in Bengaluru"*.

### Run End-to-End Search
To search across all enabled platforms for Python Developer roles in Bengaluru:
```bash
python -m src.main --role "Python Developer" --location "Bengaluru"
```

### Search Specific Sources
Use the `--sources` flag to target specific job portals (options: `naukri`, `remoteok`, `wellfound`):
```bash
python -m src.main -r "Python Developer" --sources wellfound,remoteok
```

### Headless Browser Mode (Playwright Fallback)
If you want to run the browser silently in the background for local scraping fallbacks:
```bash
python -m src.main -r "Data Scientist" -l "Mumbai" --headless
```

### Parse Offline Local HTML (100% Reliable Naukri Bypass)
If you want to parse a pre-downloaded Naukri HTML page manually (useful for absolute anti-bot bypass):
```bash
python -m src.main -r "Product Manager" -l "Bengaluru" --naukri-html "path/to/naukri_search.html"
```

---

## 🛡️ Resilient Scraping Architecture

Each scraper is designed to handle bot defenses gracefully:

* **RemoteOK**: Interacts with the public JSON API using a realistic `User-Agent` and custom regional alias mapping.
* **Naukri**: Uses a layered fallback system:
  1. *Firecrawl SDK*: Calls the Firecrawl API to retrieve fully-rendered markdown of the search listings.
  2. *Playwright Local Browser*: Runs a headful browser instance. If it detects a bot detection barrier/challenge, it halts and instructs the user to complete the CAPTCHA in the open window, resuming automatically once solved.
  3. *Internal JSON API / BeautifulSoup*: Attempts clean API or direct HTML parse.
* **Wellfound**: Utilizes the Firecrawl SDK with Javascript dynamic rendering and CSS selectors parsing to crawl Wellfound's SPA clean markdown.