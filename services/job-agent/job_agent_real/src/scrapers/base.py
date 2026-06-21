"""
Abstract base class for all job scrapers.

Every platform scraper (RemoteOK, Naukri, Wellfound) inherits from
BaseScraper and implements the `scrape()` method.
"""

import time
import logging
from abc import ABC, abstractmethod

from src.models.job import Job
from src import config


class BaseScraper(ABC):
    """
    Base class for all job scrapers.

    Subclasses must:
      1. Set `name` (e.g. "RemoteOK", "Naukri", "Wellfound")
      2. Implement `scrape(job_title) -> list[Job]`
    """

    name: str = "BaseScraper"

    def __init__(self):
        self.logger = logging.getLogger(f"job_agent.{self.name}")
        self.delay = config.REQUEST_DELAY

    @abstractmethod
    def scrape(self, job_title: str) -> list[Job]:
        """
        Scrape jobs matching the given title from this platform.

        Args:
            job_title: The job title keyword to search for (e.g. "Data Scientist").

        Returns:
            A list of Job objects. Returns an empty list if scraping fails.
        """
        pass

    def wait(self) -> None:
        """
        Sleep for the configured delay between requests.

        This is a courtesy delay to avoid overwhelming target servers
        and reduce the chance of getting rate-limited or blocked.
        """
        if self.delay > 0:
            self.logger.debug(f"Waiting {self.delay}s before next request...")
            time.sleep(self.delay)

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} name='{self.name}'>"
