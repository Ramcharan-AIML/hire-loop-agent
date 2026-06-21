"""
Pydantic schemas for the Job Agent Service.

JobRecord mirrors packages/contracts/job_record.schema.json (and the Job
dataclass in job_agent_real/src/models/job.py). See docs/architecture.md §4.1, §6.1.
"""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    role: str = Field(..., description="Job role/title, e.g. 'Python Developer'")
    location: Optional[str] = Field(
        None, description="Target location, e.g. 'Bengaluru' or 'Remote'"
    )
    sources: Optional[List[str]] = Field(
        None,
        description="Subset of ['Naukri','RemoteOK','Wellfound']; case-insensitive. "
        "Omit for all three.",
    )
    headless: bool = Field(
        True, description="Run Playwright headless (default true for server use)"
    )
    limit: Optional[int] = Field(
        None, ge=1, description="Optional cap on number of jobs returned"
    )


class JobRecord(BaseModel):
    job_title: str
    company: str
    location: str
    salary: str = ""
    experience: str = ""
    skills: str = ""
    job_url: str
    source: str
    date_posted: str = ""
    date_scraped: str


class SearchResponse(BaseModel):
    count: int
    jobs: List[JobRecord]
