"""
Orchestrator to run job scrapers, aggregate results, and export them.
"""
import logging
from src.scrapers import NaukriScraper, RemoteOKScraper, WellfoundScraper
from src.exporters.csv_exporter import export_to_csv

logger = logging.getLogger("job_agent.orchestrator")

def collect_jobs(query: str, sources: list[str] = None) -> list:
    """
    Run selected scrapers for the search query and return the aggregated
    list of Job objects in memory (no CSV side effect).

    This is the reusable core shared by the CLI (`run`) and the HTTP service
    (FastAPI wrapper in services/job-agent/app). Extracted so the API can
    return Job records as JSON without writing/reading a CSV.
    """
    if not sources:
        sources = ["naukri", "remoteok", "wellfound"]

    all_jobs = []

    # Run Naukri Scraper
    if "naukri" in sources:
        try:
            logger.info("Running Naukri Scraper...")
            scraper = NaukriScraper()
            jobs = scraper.scrape(query)
            logger.info(f"Naukri Scraper found {len(jobs)} jobs")
            all_jobs.extend(jobs)
        except Exception as e:
            logger.error(f"Naukri Scraper failed: {e}")

    # Run RemoteOK Scraper
    if "remoteok" in sources:
        try:
            logger.info("Running RemoteOK Scraper...")
            scraper = RemoteOKScraper()
            jobs = scraper.scrape(query)
            logger.info(f"RemoteOK Scraper found {len(jobs)} jobs")
            all_jobs.extend(jobs)
        except Exception as e:
            logger.error(f"RemoteOK Scraper failed: {e}")

    # Run Wellfound Scraper
    if "wellfound" in sources:
        try:
            logger.info("Running Wellfound Scraper...")
            scraper = WellfoundScraper()
            jobs = scraper.scrape(query)
            logger.info(f"Wellfound Scraper found {len(jobs)} jobs")
            all_jobs.extend(jobs)
        except Exception as e:
            logger.error(f"Wellfound Scraper failed: {e}")

    return all_jobs


def run(query: str, sources: list[str] = None) -> str:
    """
    Run selected scrapers for the search query and export results to CSV.
    """
    all_jobs = collect_jobs(query, sources=sources)

    # Standardize output file title slug
    clean_title = "".join(c if c.isalnum() else "_" for c in query.lower())
    clean_title = "_".join(filter(None, clean_title.split("_"))) # strip duplicate underscores
    
    # Export to CSV
    csv_path = export_to_csv(all_jobs, clean_title)
    
    logger.info(f"Scrape job complete. Extracted {len(all_jobs)} jobs. Saved to: {csv_path}")
    return csv_path
