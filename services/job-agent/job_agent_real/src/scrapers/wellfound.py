"""
Wellfound Scraper — fetches startup job listings from wellfound.com using Firecrawl.
"""

import re
from urllib.parse import quote_plus

from src.scrapers.base import BaseScraper
from src.models.job import Job
from src import config

class WellfoundScraper(BaseScraper):
    """Scrapes job listings from Wellfound."""

    name = "Wellfound"

    def scrape(self, job_title_or_query: str) -> list[Job]:
        """
        Scrape Wellfound jobs matching the title/query.
        
        Requires a valid Firecrawl API Key in config. If missing,
        skips execution gracefully and warns the user.
        """
        from src.utils.query_parser import parse_search_query
        job_title, location = parse_search_query(job_title_or_query)

        # 1. API Key Validation
        if not config.FIRECRAWL_API_KEY or config.FIRECRAWL_API_KEY == "fc-your-api-key-here":
            self.logger.warning("Firecrawl API Key is not configured. Skipping Wellfound Scraper.")
            return []

        if location:
            self.logger.info(f"Searching Wellfound for keyword: '{job_title}' in location: '{location}'")
        else:
            self.logger.info(f"Searching Wellfound for keyword: '{job_title}'")

        try:
            from firecrawl import Firecrawl
        except ImportError:
            try:
                from firecrawl import FirecrawlApp as Firecrawl
            except ImportError:
                self.logger.warning("firecrawl-py is not installed — skipping Wellfound strategy")
                return []

        try:
            app = Firecrawl(api_key=config.FIRECRAWL_API_KEY)
            all_jobs: list[Job] = []

            # Construct Wellfound URL
            role_slug = job_title.lower().replace(" ", "-")
            if location:
                loc_slug = location.lower().replace(" ", "-")
                url = f"https://wellfound.com/role/l/{role_slug}/{loc_slug}"
            else:
                url = f"https://wellfound.com/role/{role_slug}"

            self.logger.info(f"Calling Firecrawl to scrape Wellfound URL: {url}")
            
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
                return []

            # Extract markdown safely
            if hasattr(result, "markdown"):
                markdown = result.markdown
            elif isinstance(result, dict):
                markdown = result.get("markdown", "")
            else:
                markdown = getattr(result, "markdown", "")

            if not markdown:
                self.logger.warning("No markdown content returned from Firecrawl.")
                return []

            page_jobs = self._parse_wellfound_markdown(markdown)
            
            # Apply location compatibility filtering if a target location is specified
            compatible_jobs = []
            for job in page_jobs:
                if self._is_location_compatible(job.location, job.salary, location):
                    compatible_jobs.append(job)
                else:
                    self.logger.debug(f"Filtering out Wellfound job due to location mismatch: '{job.job_title}' at '{job.company}' (Location: '{job.location}', Salary: '{job.salary}')")

            self.logger.info(f"Wellfound returned {len(compatible_jobs)} compatible jobs out of {len(page_jobs)} total parsed.")
            return compatible_jobs

        except Exception as e:
            self.logger.error(f"Wellfound scraping failed: {e}")
            return []

    def _is_location_compatible(self, job_loc: str, job_salary: str, target_loc: str) -> bool:
        """
        Check if the job location is compatible with the user's target search location.
        Strictly restricts local or remote jobs to the target city or India domestic context.
        """
        if not target_loc:
            return True

        target_lower = target_loc.lower()
        # Handle target city aliases for exact matches
        if target_lower in ["bangalore", "bengaluru"]:
            target_cities = ["bangalore", "bengaluru"]
        elif target_lower in ["hyderabad", "hyd"]:
            target_cities = ["hyderabad", "hyd"]
        elif target_lower in ["chennai", "madras"]:
            target_cities = ["chennai", "madras"]
        else:
            target_cities = [target_lower]

        job_loc_lower = job_loc.lower()

        # 1. Direct match with target city aliases
        if any(city in job_loc_lower for city in target_cities):
            return True

        # Major Indian cities list to isolate domestic context
        indian_cities = ["hyderabad", "bengaluru", "bangalore", "chennai", "noida", "pune", "mumbai", "delhi", "gurgaon", "kolkata", "india"]
        is_target_india = any(city in target_lower for city in indian_cities)

        if is_target_india:
            # If it's a remote job:
            if any(w in job_loc_lower for w in ["remote", "worldwide", "everywhere", "no equity"]):
                # If it explicitly contains the target city or India, it's compatible
                if any(city in job_loc_lower for city in target_cities) or "india" in job_loc_lower:
                    # Double check currency: if USD-exclusive ($ and no ₹) without India context, filter out
                    if "$" in job_salary and "₹" not in job_salary and "india" not in job_loc_lower:
                        return False
                    return True
                
                # If it's a generic "Remote" without India or city context, filter it out as requested
                return False
            
            # For non-remote jobs, they must contain target city aliases or "india"
            if not any(city in job_loc_lower for city in target_cities) and "india" not in job_loc_lower:
                return False

        else:
            # If target is outside India (e.g. San Francisco), filter out Indian locations
            if any(city in job_loc_lower for city in indian_cities):
                return False

        return True

    def _parse_wellfound_markdown(self, markdown: str) -> list[Job]:
        """Parse job listings from Firecrawl's Markdown output."""
        jobs: list[Job] = []

        # Split by common job card indicators (headings or bold links)
        blocks = re.split(r'\n(?=#{1,3}\s|\*\*\[|\[\*\*)', markdown)

        for block in blocks:
            job = self._parse_markdown_block(block)
            if job:
                jobs.append(job)

        # Fallback line-by-line parser if block parser returned nothing
        if not jobs:
            jobs = self._parse_markdown_lines(markdown)

        return jobs

    def _parse_markdown_block(self, block: str) -> Job | None:
        """Parse a single job block from Wellfound Markdown."""
        try:
            lines = [l.strip() for l in block.strip().split("\n") if l.strip()]
            if not lines:
                return None

            title = ""
            job_url = ""

            # 1. Extract job title and URL (must contain /jobs)
            for line in lines:
                link_match = re.search(r'\[([^\]]+)\]\(([^)]*\/jobs[^)]*)\)', line)
                if link_match:
                    title = link_match.group(1).strip()
                    job_url = link_match.group(2).strip()
                    title = re.sub(r'[*#\[\]]', '', title).strip()
                    break

            if not title or len(title) < 3:
                return None

            # Skip header and footer navigational links
            if any(skip in title.lower() for skip in ["login", "signup", "about", "press", "careers", "terms", "privacy"]):
                return None

            if job_url and not job_url.startswith("http"):
                job_url = f"https://wellfound.com{job_url}"

            # 2. Extract company name (look for /company/ link)
            company = ""
            for line in lines:
                co_match = re.search(r'\[([^\]]+)\]\(([^)]*\/company/[^)]+)\)', line)
                if co_match:
                    company = co_match.group(1).strip()
                    company = re.sub(r'[*#\[\]]', '', company).strip()
                    break

            # 3. Extract location and salary
            location = ""
            salary = ""

            # Check lines for metadata or split by bullet points / delimiters
            for line in lines:
                clean_line = re.sub(r'[*#]', '', line).strip()
                
                # Check the line containing the job title / link
                if "•" in clean_line:
                    parts = [p.strip() for p in clean_line.split("•")]
                    for part in parts:
                        # Skip if it's the job title part
                        if title.lower() in part.lower() or "/jobs" in part:
                            continue
                        # If it has salary indicators
                        if any(c in part for c in ["₹", "$"]) or re.search(r'\b\d+k\b', part, re.I):
                            # Ensure it's not "No equity"
                            if "equity" not in part.lower():
                                salary = part
                        # Otherwise if it's a valid location and not "No equity" or company name
                        elif part and not any(w in part.lower() for w in ["equity", "company", "logo", "profile"]):
                            if not company or company.lower() not in part.lower():
                                location = part

            # Fallbacks if location/company/salary not populated
            if not company:
                for line in lines:
                    clean_line = re.sub(r'[*#]', '', line).strip()
                    if "•" in clean_line:
                        parts = [p.strip() for p in clean_line.split("•")]
                        if len(parts) >= 2 and not any(w in parts[0].lower() for w in ["salary", "equity", "remote", "$", "jobs"]):
                            company = parts[0]
                            break

            return Job.create(
                job_title=title,
                company=company or "Unknown Company",
                location=location or "Remote",
                source="Wellfound",
                job_url=job_url,
                salary=salary,
                experience="",
                skills="",
            )

        except Exception:
            return None

    def _parse_markdown_lines(self, markdown: str) -> list[Job]:
        """Fallback line-by-line parser for Wellfound Markdown."""
        jobs: list[Job] = []
        lines = markdown.split("\n")

        for i, line in enumerate(lines):
            line = line.strip()
            # Look for linked titles e.g. [Software Engineer](/jobs/1234-engineer)
            link_match = re.search(r'\[([^\]]{3,})\]\((https?://[^)]*wellfound[^)]*\/jobs\/[^)]*|/jobs/[^)]*)\)', line)
            if link_match:
                title = re.sub(r'[*#]', '', link_match.group(1)).strip()
                url = link_match.group(2)

                if url.startswith("/"):
                    url = f"https://wellfound.com{url}"

                if not any(skip in title.lower() for skip in ["login", "signup", "search", "browse", "home"]):
                    company = ""
                    location = ""
                    salary = ""

                    # Inspect neighboring lines for metadata
                    for j in range(max(0, i - 3), min(i + 6, len(lines))):
                        ctx = lines[j].strip()
                        co_m = re.search(r'\[([^\]]+)\]\(([^)]*\/company/[^)]+)\)', ctx)
                        if co_m:
                            company = re.sub(r'[*#\[\]]', '', co_m.group(1)).strip()
                        
                        if "•" in ctx:
                            parts = [p.strip() for p in ctx.split("•")]
                            for part in parts:
                                if title.lower() in part.lower() or "/jobs" in part or "equity" in part.lower():
                                    continue
                                if part and not any(w in part.lower() for w in ["salary", "equity", "remote", "$", "₹"]):
                                    location = re.sub(r'[*#\[\]]', '', part).strip()
                        
                        sal_m = re.search(r'(\$\d+k?\s*[-–]\s*\$\d+k?|\$\d+[\d,]*\s*[-–]\s*\$\d+[\d,]*|₹\d+L?\s*[-–]\s*₹\d+L?)', ctx, re.I)
                        if sal_m:
                            salary = sal_m.group(1).strip()

                    jobs.append(Job.create(
                        job_title=title,
                        company=company or "Unknown Company",
                        location=location or "Remote",
                        source="Wellfound",
                        job_url=url,
                        salary=salary,
                        experience="",
                    ))

        return jobs
