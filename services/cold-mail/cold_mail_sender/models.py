from dataclasses import dataclass

@dataclass
class Contact:
    recipient_email: str          # Required
    company: str                  # Required
    role: str                     # Required
    candidate_name: str           # Required
    candidate_background: str     # Required
    recipient_name: str | None = None
    job_url: str | None = None
    portfolio_url: str | None = None
    personalization_note: str | None = None
    linkedin_url: str | None = None
    resume_link: str | None = None

@dataclass
class EmailDraft:
    subject: str
    body: str
    word_count: int

@dataclass
class LogEntry:
    timestamp: str
    recipient_email: str
    company: str
    role: str
    subject: str
    status: str                   # generated | drafted | sent | skipped | failed
    error_message: str = ""
