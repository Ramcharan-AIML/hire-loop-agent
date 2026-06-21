"""
Job data model — the unified schema for all scraped job listings.

Every scraper normalizes its platform-specific data into this dataclass
before passing it to the CSV exporter.
"""

from dataclasses import dataclass, asdict, fields
from collections import OrderedDict
from datetime import datetime


@dataclass
class Job:
    """Represents a single job listing from any supported platform."""

    job_title: str
    company: str
    location: str
    salary: str
    experience: str
    skills: str
    job_url: str
    source: str         # "Naukri" | "RemoteOK" | "Wellfound"
    date_posted: str
    date_scraped: str

    def to_dict(self) -> OrderedDict:
        """
        Convert this Job to an OrderedDict with fields in schema order.

        Used by csv.DictWriter to ensure consistent column ordering.
        """
        return OrderedDict(asdict(self))

    @classmethod
    def csv_headers(cls) -> list[str]:
        """
        Return the list of CSV column names in schema order.

        Example:
            >>> Job.csv_headers()
            ['job_title', 'company', 'location', ...]
        """
        return [f.name for f in fields(cls)]

    @classmethod
    def create(
        cls,
        job_title: str,
        company: str,
        location: str,
        source: str,
        job_url: str,
        salary: str = "",
        experience: str = "",
        skills: str = "",
        date_posted: str = "",
    ) -> "Job":
        """
        Factory method to create a Job with auto-filled date_scraped.

        Use this instead of the raw constructor so date_scraped is always
        set to the current timestamp automatically.
        """
        return cls(
            job_title=job_title.strip(),
            company=company.strip(),
            location=location.strip(),
            salary=salary.strip(),
            experience=experience.strip(),
            skills=skills.strip(),
            job_url=job_url.strip(),
            source=source.strip(),
            date_posted=date_posted.strip(),
            date_scraped=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )

    def __str__(self) -> str:
        return f"[{self.source}] {self.job_title} @ {self.company} ({self.location})"
