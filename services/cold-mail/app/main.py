"""
Cold Mail Service — FastAPI wrapper around the vendored `cold_mail_sender` CLI.

The terminal approval wizard is split into two HTTP calls (architecture.md §3.3, §6.3):
  - POST /generate  -> builds an EmailDraft (Groq or template fallback), NO send.
  - POST /send      -> refuses unless approved == true; honors DRY_RUN + volume cap.

All safety of the original CLI is preserved: dry-run default, the human approval
gate, the per-run volume cap, and the audit CSV log.

Run locally:  uvicorn app.main:app --reload --port 8001   (from services/cold-mail)
"""
from __future__ import annotations

import datetime
import os
import sys
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException

# --- Make the vendored package importable (it uses bare `from models import`) ---
COLD_MAIL_ROOT = Path(__file__).resolve().parent.parent / "cold_mail_sender"
if str(COLD_MAIL_ROOT) not in sys.path:
    sys.path.insert(0, str(COLD_MAIL_ROOT))
# The vendored code writes/reads its audit log relative to cwd; anchor it.
os.chdir(COLD_MAIL_ROOT)

from models import Contact, EmailDraft  # noqa: E402
from config import load_config  # noqa: E402
from email_generator import generate_email  # noqa: E402
from email_sender import DryRunEmailSender, SmtpEmailSender  # noqa: E402
from logger import append_log  # noqa: E402

from .schemas import (  # noqa: E402
    ContactModel,
    EmailDraftModel,
    GenerateRequest,
    SendRequest,
    LogEntryModel,
)

app = FastAPI(title="Cold Mail Service", version="0.1.0")

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")
AUDIT_LOG_PATH = COLD_MAIL_ROOT / "outreach_log.csv"

# In-process counter of REAL (non-dry-run) sends, to honor the per-run volume cap.
_real_send_count = 0


def _auth(provided: str) -> None:
    if INTERNAL_API_KEY and provided != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="invalid or missing X-Internal-Key")


def _to_contact(m: ContactModel) -> Contact:
    return Contact(**m.model_dump())


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.post("/generate", response_model=EmailDraftModel)
def generate(req: GenerateRequest, x_internal_key: str = Header(default="")):
    _auth(x_internal_key)
    config = load_config()
    draft: EmailDraft = generate_email(_to_contact(req.contact), config)
    return EmailDraftModel(
        subject=draft.subject, body=draft.body, word_count=draft.word_count
    )


@app.post("/send", response_model=LogEntryModel)
def send(req: SendRequest, x_internal_key: str = Header(default="")):
    global _real_send_count
    _auth(x_internal_key)

    # ── Human-in-the-loop gate (architecture.md §5, §10) ──────────────────
    if not req.approved:
        raise HTTPException(status_code=409, detail="approval required")

    config = load_config()
    contact = _to_contact(req.contact)
    draft = EmailDraft(
        subject=req.draft.subject,
        body=req.draft.body,
        word_count=req.draft.word_count,
    )

    # Resolve safety settings: request overrides fall back to server env defaults.
    dry_run = config.dry_run if req.dry_run is None else req.dry_run
    mode = (req.mode or config.send_mode).lower()
    if mode not in ("draft", "send"):
        mode = "draft"

    # ── Per-run volume cap, only for real sends (architecture.md §10) ─────
    if not dry_run:
        if _real_send_count >= config.max_outreach_per_run:
            raise HTTPException(
                status_code=429,
                detail=f"volume cap reached ({config.max_outreach_per_run} per run)",
            )

    sender = DryRunEmailSender() if dry_run else SmtpEmailSender()
    result = sender.deliver(draft, contact, config, mode)

    if not dry_run and result.status != "failed":
        _real_send_count += 1

    # ── Audit log (reuse the vendored CSV logger) ─────────────────────────
    append_log(
        contact, draft, result.status, result.error or "", path=str(AUDIT_LOG_PATH)
    )

    timestamp = (
        datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
    )
    return LogEntryModel(
        timestamp=timestamp,
        recipient_email=contact.recipient_email,
        company=contact.company,
        role=contact.role,
        subject=draft.subject,
        status=result.status,
        error_message=result.error or "",
    )


@app.get("/log", response_model=list[LogEntryModel])
def get_log(x_internal_key: str = Header(default="")):
    _auth(x_internal_key)
    import csv

    if not AUDIT_LOG_PATH.exists():
        return []
    out: list[LogEntryModel] = []
    with open(AUDIT_LOG_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            out.append(
                LogEntryModel(
                    timestamp=row.get("timestamp", ""),
                    recipient_email=row.get("recipient_email", ""),
                    company=row.get("company", ""),
                    role=row.get("role", ""),
                    subject=row.get("subject", ""),
                    status=row.get("status", ""),
                    error_message=row.get("error_message", ""),
                )
            )
    return out
