"""
Pydantic schemas for the Cold Mail Service.

Mirror packages/contracts/{contact,email_draft}.schema.json and the dataclasses
in cold_mail_sender/models.py. See docs/architecture.md §4.3, §4, §6.3.
"""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


class ContactModel(BaseModel):
    recipient_email: EmailStr
    company: str
    role: str
    candidate_name: str
    candidate_background: str
    recipient_name: Optional[str] = None
    job_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    personalization_note: Optional[str] = None
    linkedin_url: Optional[str] = None
    resume_link: Optional[str] = None


class EmailDraftModel(BaseModel):
    subject: str
    body: str
    word_count: int


class GenerateRequest(BaseModel):
    contact: ContactModel


class SendRequest(BaseModel):
    contact: ContactModel
    draft: EmailDraftModel
    approved: bool = Field(
        False, description="Human-in-the-loop gate: send is refused unless true."
    )
    dry_run: Optional[bool] = Field(
        None, description="Override DRY_RUN env. None = use server default."
    )
    mode: Optional[str] = Field(
        None, description="'draft' (to self) or 'send' (to recipient). "
        "None = use SEND_MODE env.",
    )


class LogEntryModel(BaseModel):
    timestamp: str
    recipient_email: str
    company: str
    role: str
    subject: str
    status: str  # generated | drafted | sent | skipped | failed
    error_message: str = ""
