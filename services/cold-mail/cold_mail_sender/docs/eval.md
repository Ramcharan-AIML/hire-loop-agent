# Phase-Wise Evaluation Suite: The Closer — Cold Email Writer + Send Bot

This document defines the evaluation criteria, verification commands, and pass/fail thresholds for each phase of the build. Use this guide to programmatically and manually validate the implementation progress.

---

## Phase 1: Environment, Models & Mock Data Setup

### 1. Verification Checklist
- [ ] `.env.example` exists and contains correct keys without active production credentials.
- [ ] `.env` is loaded using `python-dotenv` and ignored in `.gitignore`.
- [ ] `config.py` correctly parses all environment variables with robust fallback options.
- [ ] `models.py` defines `Contact`, `EmailDraft`, and `LogEntry` as strongly-typed Python `dataclass` records.
- [ ] `contacts.json` is populated with exactly 5 realistic target records containing both required and optional parameters.

### 2. Evaluation Commands
Create a temporary validation script `scratch/test_phase1.py` or run:
```python
from config import load_config
from models import Contact
import json

# Assert configuration parses correctly
config = load_config()
assert config.dry_run is True, "Safety Guardrail Fail: DRY_RUN must default to True"
assert config.max_outreach_per_run == 5, "Safety Guardrail Fail: Default limit must be 5"

# Assert data models are correct
with open("contacts.json", "r") as f:
    data = json.load(f)
    assert len(data) >= 5, "Data Fail: contacts.json must have at least 5 records"
    contact = Contact(**data[0])
    assert contact.recipient_email is not None, "Model Fail: Contact must hold recipient email"
print("Phase 1 Evaluation: PASS ✅")
```

---

## Phase 2: Generation Engine & Logger Build

### 1. Verification Checklist
- [ ] `email_generator.py` correctly generates standard-compliant cold emails.
- [ ] Word count checker enforces that no draft exceeds $150$ words.
- [ ] Rejects missing required parameters (`recipient_email`, `company`, `role`, `candidate_name`, `candidate_background`).
- [ ] `logger.py` appends log files safely; handles column spacing, commas, and quotes within email body values seamlessly.
- [ ] Log entry records timestamps correctly in ISO format.

### 2. Evaluation Commands
Run assertions against generator outputs:
```python
from email_generator import generate_email
from models import Contact
from logger import append_log
import os

contact = Contact(
    recipient_email="test@example.com",
    company="Tech Corp",
    role="Software Intern",
    candidate_name="Alice",
    candidate_background="Python automation scripts"
)

draft = generate_email(contact)
assert draft.word_count <= 150, f"Constraint Fail: Draft has {draft.word_count} words (Limit: 150)"
assert "Tech Corp" in draft.body, "Personalization Fail: Body missing company name"
assert "Software Intern" in draft.body, "Personalization Fail: Body missing role name"

# Log testing
append_log(contact, draft, status="generated", path="test_outreach_log.csv")
assert os.path.exists("test_outreach_log.csv"), "Logger Fail: File not created"
os.remove("test_outreach_log.csv")
print("Phase 2 Evaluation: PASS ✅")
```

---

## Phase 3: Interactive Shell & Orchestrator Flow

### 1. Verification Checklist
- [ ] `preview.py` formats and outputs subjects, bodies, target details, and word counts cleanly.
- [ ] The CLI loops iterate through contacts successfully, stopping exactly when it hits `MAX_OUTREACH_PER_RUN`.
- [ ] Accepts only valid actions: `send`, `draft`, or `skip`. Re-prompts the user on bad keystrokes.
- [ ] Flow catches and handles skips or exceptions per-target without terminating the orchestrator.

### 2. Evaluation Scenario (Mock CLI Prompting)
Simulate user actions in the terminal:
1. Load 5 targets in `contacts.json`.
2. Configure `MAX_OUTREACH_PER_RUN=3` in `.env`.
3. Start `python main.py` with `DRY_RUN=true`.
4. At the first prompt, input `"invalid_key"`.
   - **Expectation:** Terminal warns and re-prompts for `[send/draft/skip]`.
5. At the second prompt, input `"skip"`.
   - **Expectation:** State updates to `skipped`, appends to audit log, and moves to target 2.
6. For target 2 and 3, input `"send"`.
   - **Expectation:** State updates to `generated` (due to dry-run), appends to audit log.
7. Confirm terminal prints summary showing `Total: 3, Sent/Drafted: 2, Skipped: 1, Failed: 0`.
8. Confirm CLI terminates immediately after the third target due to limit cap.

---

## Phase 4: Pluggable Network Delivery

### 1. Verification Checklist
- [ ] `email_sender.py` abstracts sending protocols behind a standard interface.
- [ ] `DryRunEmailSender` executes a successful mock delivery without making actual SMTP calls.
- [ ] `SmtpEmailSender` connects safely using `STARTTLS` (port 587) or `SSL` (port 465).
- [ ] Catches incorrect authentication parameters or offline network states gracefully without dropping log executions.

### 2. Evaluation Commands
```python
from email_sender import SmtpEmailSender, DryRunEmailSender
from models import Contact, EmailDraft
from config import load_config

config = load_config()
draft = EmailDraft(subject="Test", body="Body text", word_count=2)
contact = Contact(recipient_email="self@example.com", company="X", role="Y", candidate_name="Z", candidate_background="W")

# Assert Dry Run adapter makes no socket connection
dry_sender = DryRunEmailSender()
result = dry_sender.deliver(draft, contact, config, mode="draft")
assert result.status == "drafted", "Sender Fail: DryRun status mismatch"
assert result.error is None, "Sender Fail: DryRun should not throw errors"

# Assert SMTP raises descriptive exception on empty credentials
smtp_sender = SmtpEmailSender()
empty_config = config
empty_config.smtp_password = ""
result = smtp_sender.deliver(draft, contact, empty_config, mode="send")
assert result.status == "failed", "Sender Fail: Empty password should result in failed status"
assert "password" in result.error.lower() or "auth" in result.error.lower(), "Sender Fail: Error trace missing Auth description"
print("Phase 4 Evaluation: PASS ✅")
```

---

## Phase 5: Verification & Review

### 1. Acceptance Criteria Checklist
- [ ] Minimum 5 distinct personalized drafts can be run consecutively in dry-run mode.
- [ ] Every run writes an exact and matching record to `outreach_log.csv` containing timestamps, recipient address, status, and error states.
- [ ] End-to-end execution generates realistic plain text emails under 150 words with no placeholder text or fictional data.
- [ ] Manual send to self (with `DRY_RUN=false`) successfully delivers/drafts message in mailbox folders.

### 2. Final Evaluation Script
Run the complete pipeline dry-run to verify integrity:
```bash
python main.py
```
- Validate that `outreach_log.csv` exists and contains correct entries:
```bash
cat outreach_log.csv
```
Confirm column alignments are clean and all entries are properly quoted.
