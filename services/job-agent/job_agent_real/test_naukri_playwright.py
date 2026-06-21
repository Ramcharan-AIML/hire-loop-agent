"""
Test script for the Naukri Scraper using Playwright strategy.
"""

from src.config import setup_logging
from src.scrapers.naukri import NaukriScraper
from src.exporters.csv_exporter import export_to_csv

# Setup logging
logger = setup_logging()

# Instantiate scraper
scraper = NaukriScraper()
logger.info(f"Initialized scraper: {scraper}")

# Search for jobs using Playwright
jobs = scraper.scrape("find product manager roles in Bengaluru")

logger.info(f"Total jobs found: {len(jobs)}")
if jobs:
    for i, job in enumerate(jobs[:5], 1):
        logger.info(f"{i}. {job.job_title} at {job.company} ({job.location})")
        logger.info(f"   URL: {job.job_url}")
        logger.info(f"   Experience: {job.experience} | Salary: {job.salary}")
        logger.info(f"   Skills: {job.skills}")

    # Export to CSV
    csv_path = export_to_csv(jobs, "product_manager_bengaluru")
    logger.info(f"Successfully exported to CSV: {csv_path}")
else:
    logger.warning("No jobs were found.")
