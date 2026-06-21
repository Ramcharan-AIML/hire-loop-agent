"""
RemoteOK Scraper — fetches remote job listings from remoteok.com using their public JSON API.
"""

from datetime import datetime
import requests
from urllib.parse import quote_plus

from src.scrapers.base import BaseScraper
from src.models.job import Job
from src import config

class RemoteOKScraper(BaseScraper):
    """Scrapes job listings from RemoteOK."""

    name = "RemoteOK"
    API_URL = "https://remoteok.com/api"

    def scrape(self, job_title_or_query: str) -> list[Job]:
        """
        Fetch remote jobs matching the given title/query.
        """
        from src.utils.query_parser import parse_search_query
        job_title, location = parse_search_query(job_title_or_query)
        
        if location:
            self.logger.info(f"Searching RemoteOK for keyword: '{job_title}' with location filter: '{location}'")
        else:
            self.logger.info(f"Searching RemoteOK for keyword: '{job_title}'")

        try:
            # RemoteOK requires a valid User-Agent or it returns 403 Access Denied
            headers = {
                "User-Agent": config.USER_AGENT,
                "Accept": "application/json",
            }
            
            response = requests.get(self.API_URL, headers=headers, timeout=15)
            
            if response.status_code != 200:
                self.logger.error(f"RemoteOK API returned status {response.status_code}")
                return []
                
            data = response.json()
            
            # The first element in the array is a legal/metadata disclaimer, we skip it
            if not isinstance(data, list) or len(data) <= 1:
                self.logger.warning("RemoteOK API returned empty or invalid data array")
                return []
                
            job_listings = data[1:]
            matching_jobs: list[Job] = []
            
            # Normalize title keywords for comparison
            keywords = [kw.strip().lower() for kw in job_title.lower().split() if kw.strip()]
            
            import re
            
            for item in job_listings:
                job = self._parse_api_job(item)
                if not job:
                    continue
                    
                # Match title / position and tags
                pos_lower = job.job_title.lower()
                skills_lower = job.skills.lower()
                tags_lower = [t.lower() for t in item.get("tags", [])]
                
                # Check if all keyword tokens are present (with boundary safety for short tokens like 'ai')
                matches_keyword = True
                for kw in keywords:
                    if len(kw) <= 2:
                        # Short keyword (like 'ai', 'ml', 'go') needs whole word boundary match to avoid false positive campaign/retail matches
                        kw_pattern = rf"\b{re.escape(kw)}\b"
                        matched_in_title = bool(re.search(kw_pattern, pos_lower))
                        matched_in_tags = any(t == kw for t in tags_lower)
                        if not (matched_in_title or matched_in_tags):
                            # Smart technical expansion alias check: e.g. 'ml' matches 'machine learning'
                            if kw == "ml" and ("machine learning" in pos_lower or "machine-learning" in tags_lower):
                                continue
                            if kw == "ai" and ("artificial intelligence" in pos_lower or "artificial-intelligence" in tags_lower):
                                continue
                            matches_keyword = False
                            break
                    else:
                        # Longer keyword (like 'engineer', 'developer', 'assistant')
                        # Also support matching 'ml' abbreviation if search keyword was 'machine learning'
                        if not (kw in pos_lower or kw in skills_lower):
                            # Special case: 'machine' or 'learning' matching 'ml' tag or 'ml' word
                            if kw in ["machine", "learning"] and (re.search(r"\bml\b", pos_lower) or "ml" in tags_lower):
                                continue
                            matches_keyword = False
                            break
                
                # Match location if specified
                matches_location = True
                if location:
                    loc_lower = location.lower().strip()
                    job_loc_lower = job.location.lower().strip()
                    
                    # RemoteOK is a remote-first platform. If job is Worldwide, Anywhere, Remote, or empty, it's compatible!
                    is_anywhere = not job_loc_lower or any(word in job_loc_lower for word in ["worldwide", "remote", "anywhere"])
                    
                    if is_anywhere:
                        matches_location = True
                    else:
                        # Country region aliases mapping
                        aliases = {
                            "usa": ["united states", "us", "america", "united states of america"],
                            "uk": ["united kingdom", "great britain", "gb", "england", "london"],
                            "india": ["in", "delhi", "mumbai", "bengaluru", "bangalore", "hyderabad", "pune", "chennai"],
                        }
                        
                        # Check direct substring match
                        if loc_lower in job_loc_lower or job_loc_lower in loc_lower:
                            matches_location = True
                        else:
                            # Check alias matching
                            matched_alias = False
                            for key, vals in aliases.items():
                                if loc_lower == key or loc_lower in vals:
                                    if any(val in job_loc_lower for val in [key] + vals):
                                        matched_alias = True
                                        break
                            
                            matches_location = matched_alias
                    
                if matches_keyword and matches_location:
                    matching_jobs.append(job)
                    
            self.logger.info(f"Found {len(matching_jobs)} matching remote jobs out of {len(job_listings)} listings.")
            return matching_jobs

        except Exception as e:
            self.logger.error(f"Failed to scrape RemoteOK: {e}")
            return []

    def _parse_api_job(self, item: dict) -> Job | None:
        """Parse a single job entry from the RemoteOK JSON response."""
        try:
            title = item.get("position", "").strip()
            company = item.get("company", "").strip()
            job_url = item.get("url", "")
            
            if not title or not company:
                return None
                
            # Extract tags/skills
            tags = item.get("tags", [])
            skills = ", ".join(tags) if isinstance(tags, list) else str(tags)
            
            # Location
            location = item.get("location", "Remote").strip()
            
            # Salary formatting
            # RemoteOK provides salary_min and salary_max
            salary_min = item.get("salary_min")
            salary_max = item.get("salary_max")
            salary = ""
            if salary_min and salary_max:
                salary = f"${salary_min:,} - ${salary_max:,} USD/yr"
            elif salary_min:
                salary = f"${salary_min:,}+ USD/yr"
                
            # Date posted
            date_str = item.get("date", "")
            date_posted = ""
            if date_str:
                try:
                    # RemoteOK returns ISO format: "2026-05-31T05:30:00-07:00"
                    dt = datetime.fromisoformat(date_str)
                    date_posted = dt.strftime("%Y-%m-%d")
                except Exception:
                    date_posted = date_str
                    
            return Job.create(
                job_title=title,
                company=company,
                location=location,
                source="RemoteOK",
                job_url=job_url,
                salary=salary,
                experience="", # RemoteOK doesn't have an experience parameter
                skills=skills,
                date_posted=date_posted,
            )
            
        except Exception as e:
            self.logger.debug(f"Failed to parse RemoteOK item: {e}")
            return None
