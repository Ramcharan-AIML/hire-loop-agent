from src.scrapers.base import BaseScraper
from src.scrapers.naukri import NaukriScraper
from src.scrapers.remoteok import RemoteOKScraper
from src.scrapers.wellfound import WellfoundScraper
from src.scrapers.job_description import fetch_job_description

__all__ = [
    "BaseScraper",
    "NaukriScraper",
    "RemoteOKScraper",
    "WellfoundScraper",
    "fetch_job_description",
]

