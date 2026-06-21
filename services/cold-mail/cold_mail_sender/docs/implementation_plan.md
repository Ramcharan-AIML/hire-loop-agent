# Implementation Plan: The Closer — Cold Email Writer + Send Bot

> Derived from [architecture.md](./architecture.md) sections 1–16 and [problemStatement.md](./problemStatement.md).
> Every architectural component, domain model, safety guardrail, error strategy, testing requirement, and stretch goal is mapped to a concrete implementation phase below.

---

## Table of Contents

1. [Architecture Goals Alignment](#1-architecture-goals-alignment)
2. [Repository Layout & File Manifest](#2-repository-layout--file-manifest)
3. [Phase 1 — Project Skeleton, Configuration & Domain Models](#phase-1--project-skeleton-configuration--domain-models)
4. [Phase 2 — Input Loader & Contact Validation](#phase-2--input-loader--contact-validation)
5. [Phase 3 — Email Generator (Template + Groq LLM)](#phase-3--email-generator-template--groq-llm)
6. [Phase 4 — Preview, Confirmation & CLI Orchestrator](#phase-4--preview-confirmation--cli-orchestrator)
7. [Phase 5 — Email Sender Adapters (DryRun + SMTP)](#phase-5--email-sender-adapters-dryrun--smtp)
8. [Phase 6 — Audit Logger](#phase-6--audit-logger)
9. [Phase 7 — End-to-End Integration, Testing & Proof](#phase-7--end-to-end-integration-testing--proof)
10. [Phase 8 — Stretch Goals](#phase-8--stretch-goals)
11. [Acceptance Criteria Traceability](#acceptance-criteria-traceability)
12. [Security Checklist](#security-checklist)

---

## 1. Architecture Goals Alignment

Every phase maps back to the five architecture goals (Arch §1):

| Goal | How this plan ensures it |
|------|--------------------------|
| **Explainable in a live demo** | Phases follow the vertical-slice demo order (Arch §13); each phase produces a runnable, testable artifact |
| **Safe by default** | Phase 1 ships `DRY_RUN=true`; Phase 4 enforces human confirmation gate; Phase 5 implements volume caps |
| **Modular** | Each phase creates exactly one module with a single public interface |
| **Extensible** | Sender uses adapter pattern (Phase 5); generator uses strategy pattern (Phase 3); stretch goals (Phase 8) plug in without changing `main.py` |
| **Auditable** | Phase 6 implements append-only CSV logging; every status (sent/drafted/skipped/failed) is recorded |

**Non-goals for MVP:** bulk sending, unattended automation, multi-tenant SaaS, or a production-grade email platform.

---

## 2. Repository Layout & File Manifest

Aligned with Arch §10. Files are listed in implementation order.

```text
the-closer/
│
├── .env.example            # Phase 1 — safe defaults, never committed
├── .env                    # Phase 1 — operator's live config (gitignored)
├── .gitignore              # Phase 1
├── requirements.txt        # Phase 1
├── config.py               # Phase 1 — AppConfig dataclass + env loader
├── models.py               # Phase 1 — Contact, EmailDraft, LogEntry
├── contacts.json           # Phase 2 — sample input (5 records)
├── input_loader.py         # Phase 2 — JSON/CSV/hardcoded loader + validation
├── email_generator.py      # Phase 3 — template + Groq LLM generation
├── preview.py              # Phase 4 — terminal preview + confirmation prompt
├── main.py                 # Phase 4 — orchestrator + per-contact state machine
├── email_sender.py         # Phase 5 — DryRun / SMTP / Gmail adapters
├── logger.py               # Phase 6 — outreach_log.csv append
├── outreach_log.csv        # Phase 6 — generated at runtime
├── README.md               # Phase 7 — setup guide
└── docs/
    ├── problemStatement.md
    ├── architecture.md
    ├── implementation_plan.md   # this file
    ├── edge-case.md
    └── eval.md
```

---

## Phase 1 — Project Skeleton, Configuration & Domain Models

> **Arch references:** §5.7 (config.py), §6 (Domain Model), §9 (Deployment & Runtime), §15 (Security)

### Objective
Bootstrap the project with environment handling, type-safe domain models, dependency management, and secret isolation.

### Deliverables

#### [NEW] `requirements.txt`
```text
python-dotenv==1.0.1
groq==0.9.0
```
- `python-dotenv` loads `.env` files.
- `groq` is the official Groq SDK for the LLM stretch/integration.
- Add `google-api-python-client` and `google-auth-oauthlib` only if Gmail API draft mode is implemented later.

#### [NEW] `.env.example`
Exposes all configuration knobs with safe defaults (Arch §5.7):

| Variable | Default | Notes |
|----------|---------|-------|
| `SMTP_HOST` | `smtp.gmail.com` | |
| `SMTP_PORT` | `587` | STARTTLS |
| `SMTP_USER` | *(empty)* | Required for real send |
| `SMTP_PASSWORD` | *(empty)* | Gmail App Password |
| `SENDER_NAME` | *(empty)* | Display name in From header |
| `DRY_RUN` | `true` | **Safety default** — no network calls |
| `SEND_MODE` | `draft` | `draft` or `send` |
| `MAX_OUTREACH_PER_RUN` | `5` | Volume cap |
| `INPUT_PATH` | `contacts.json` | |
| `GROQ_API_KEY` | *(empty)* | Optional, for LLM rewriting |
| `LLM_PROVIDER` | `groq` | Provider selector |
| `LLM_MODEL` | `llama-3.1-8b-instant` | Configurable model |

#### [NEW] `.gitignore`
Must contain: `.env`, `outreach_log.csv`, `__pycache__/`, `*.pyc`

#### [NEW] `config.py`
- `AppConfig` dataclass holding all fields from the table above.
- `load_config() -> AppConfig` function:
  - Calls `load_dotenv()`.
  - Parses each variable with defensive fallback logic.
  - `DRY_RUN` defaults to `True` unless explicitly set to `"false"`, `"0"`, or `"no"`.
  - `SEND_MODE` validates against `("draft", "send")`; falls back to `"draft"`.
  - `SMTP_PORT` wraps in `try/except ValueError`; falls back to `587`.
  - `MAX_OUTREACH_PER_RUN` wraps in `try/except ValueError`; falls back to `5`.
  - `GROQ_API_KEY` becomes `None` if empty.

#### [NEW] `models.py`
Three dataclasses matching Arch §6:

**`Contact`** (§6.1) — input record:
```python
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
```

**`EmailDraft`** (§6.2) — generator output:
```python
@dataclass
class EmailDraft:
    subject: str
    body: str
    word_count: int
```

**`LogEntry`** (§6.3) — logger row:
```python
@dataclass
class LogEntry:
    timestamp: str
    recipient_email: str
    company: str
    role: str
    subject: str
    status: str                   # generated | drafted | sent | skipped | failed
    error_message: str = ""
```

### Verification
- Import `config.py` and assert `load_config()` returns `dry_run=True` and `max_outreach_per_run=5` with default `.env`.
- Instantiate each dataclass with sample data; confirm no import or type errors.

---

## Phase 2 — Input Loader & Contact Validation

> **Arch references:** §5.2 (Input Loader), §6.1 (Contact model), §8 (Error Handling — invalid contact row)

### Objective
Build `input_loader.py` to parse contact targets from JSON (and optionally CSV/hardcoded), with per-record validation that skips invalid rows without crashing the pipeline.

### Deliverables

#### [NEW] `contacts.json`
5 realistic sample records with diverse companies, roles, and personalization notes. Every record must include all 5 required fields; some should exercise optional fields (URLs, personalization notes), and some should omit them to test defaults.

#### [NEW] `input_loader.py`

**Public interface:**
```python
def load_targets(path: str | None = None) -> list[Contact]:
```

**Behavior:**
1. Default `path` to `"contacts.json"` if `None`.
2. Raise `FileNotFoundError` with clear message if file missing.
3. Parse JSON; raise `ValueError` on malformed JSON.
4. Validate each record against the required fields table (Arch §5.2):

| Field | Required | Validation |
|-------|----------|------------|
| `recipient_email` | Yes | Contains `@` and `.` |
| `company` | Yes | Non-empty after strip |
| `role` | Yes | Non-empty after strip |
| `candidate_name` | Yes | Non-empty after strip |
| `candidate_background` | Yes | Non-empty after strip |
| `recipient_name` | No | Falls back to `None` |
| `personalization_note` | No | Falls back to `None` |
| URLs | No | Stripped or `None` |

5. On validation failure: print `WARNING` to terminal with record index and missing fields, **skip the record**, continue to next.
6. Return `list[Contact]` of valid records only.

### Error Handling (Arch §8)
- Invalid contact row → skip record, warn in terminal, do not crash.
- Empty file → return empty list, print informational message.

### Verification
- Load `contacts.json` and assert exactly 5 valid `Contact` objects returned.
- Create a test JSON with a record missing `recipient_email` → assert it's skipped with a warning.
- Create an empty JSON array → assert empty list returned.

---

## Phase 3 — Email Generator (Template + Groq LLM)

> **Arch references:** §5.3 (email_generator.py), §6.2 (EmailDraft), §7 (Safety — no fabrication), §11 (Stretch — Groq LLM rewriting)

### Objective
Implement the cold email generation engine with a deterministic f-string template (MVP) and an optional Groq LLM refinement pass (stretch, active when `GROQ_API_KEY` is set).

### Deliverables

#### [NEW] `email_generator.py`

**Six-part email anatomy** (Arch §5.3):

| Section | Implementation |
|---------|----------------|
| **Subject** | `f"Quick note on the {role} role at {company}"` |
| **Personalization hook** | `personalization_note` if present; otherwise `f"I noticed {company} is seeking talent for the {role} position."` |
| **Introduction** | `candidate_name` + `candidate_background` |
| **Value / fit** | Connect `candidate_background` to `role` |
| **One clear ask** | Fixed polite CTA: "Would you be open to a quick look at my profile or pointing me to the right person?" |
| **Sign-off** | `candidate_name`, optional `portfolio_url` |

**Public interface:**
```python
def generate_email_template(contact: Contact) -> EmailDraft:
    """Deterministic f-string template. Always available."""

def generate_email(contact: Contact, config: AppConfig | None = None) -> EmailDraft:
    """Main entry point. Uses Groq refinement if API key present, else template."""
```

**Constraints enforced in code** (Arch §5.3, §7):
- `word_count <= 150` — calculated via `len(body.split())`; if Groq output exceeds limit, fall back to template with `WARNING`.
- Single ask — template structurally enforces one CTA block.
- No invented facts — template only interpolates provided fields; Groq prompt explicitly forbids hallucination.
- Empty `personalization_note` → use company+role fallback hook (never a blank space).

**Groq LLM refinement** (when `config.groq_api_key` is set):
1. Generate base template draft.
2. Send to Groq API with a system prompt enforcing the six-part anatomy, 150-word limit, and no-hallucination rules.
3. Use `config.llm_model` dynamically (e.g., `llama-3.3-70b-versatile`).
4. Post-validate the Groq output: check word count, strip accidental `Subject:` prefixes.
5. If Groq fails (API error, word count exceeded, empty response): fall back to template with `WARNING`.

**Safety gate** (Arch §7):
- Generator must never invent experience, referrals, or relationships.
- Template fields are the **only** source of factual content.
- Groq prompt includes explicit instructions: "DO NOT invent or hallucinate any work experience, referrals, or facts not present in the draft."

### Verification
- Generate emails for all 5 contacts with `config=None` (template only); assert all `word_count <= 150`.
- Generate emails with Groq API key set; assert `word_count <= 150` and `company`/`role` appear in body.
- Test with a contact missing `personalization_note`; assert fallback hook is used (no blank line).

---

## Phase 4 — Preview, Confirmation & CLI Orchestrator

> **Arch references:** §5.1 (main.py), §5.4 (Preview & Confirmation), §3 (High-Level Architecture), §4 (Data Flow), §7 (Safety — human review gate), §8 (Error Handling)

### Objective
Build the interactive terminal preview, human-in-the-loop confirmation prompt, and the main orchestrator that wires the entire pipeline together.

### Deliverables

#### [NEW] `preview.py`

**Public interface:**
```python
def preview_email(draft: EmailDraft, contact: Contact, index: int, total: int) -> None:
    """Pretty-prints the email preview with metadata and word count."""

def prompt_action() -> Literal["send", "draft", "skip"]:
    """Prompts operator for action. Re-prompts on invalid input."""
```

**Preview format:**
```text
================================================================================
 OUTREACH TARGET PREVIEW [1/5]
================================================================================
Recipient Name : Priya Sharma
Recipient Email: priya@example.com
Company        : Acme AI
Target Role    : Backend Engineering Intern
Job URL        : https://example.com/job
--------------------------------------------------------------------------------
SUBJECT: Quick note on the Backend Engineering Intern role at Acme AI
--------------------------------------------------------------------------------
<email body>
--------------------------------------------------------------------------------
Word Count     : 85 words (limit: 150)
================================================================================
```

**Confirmation rules** (Arch §5.4):
- Accept only `"send"`, `"draft"`, `"skip"` (case-insensitive).
- Re-prompt on any other input with: `"Invalid input. Please choose one of: send, draft, skip."`
- Catch `KeyboardInterrupt` / `EOFError` → default to `"skip"`.

#### [NEW] `main.py`

**Per-contact state machine** (Arch §5.1):
```text
[*] → Loaded → Generated → Previewed → Skipped | Delivering → Drafted | Sent | Failed → [*]
```

**Orchestrator flow:**
1. Load configuration via `load_config()`.
2. Print safety envelope status: `DRY_RUN`, `SEND_MODE`, `MAX_OUTREACH_PER_RUN`, `LLM_MODEL`.
3. Load targets via `load_targets(config.input_path)`.
4. If no valid targets loaded → exit gracefully with status code `0`.
5. Slice targets to `config.max_outreach_per_run` (volume cap — Arch §7).
6. For each contact:
   a. Generate email via `generate_email(contact, config)`.
   b. Display preview via `preview_email(draft, contact, idx, total)`.
   c. Prompt for action via `prompt_action()`.
   d. If `"skip"` → log as `skipped`, continue.
   e. If `config.dry_run` → use `DryRunEmailSender`, else use `SmtpEmailSender`.
   f. Call `sender.deliver(draft, contact, config, mode=action)`.
   g. Log result status via `append_log()`.
7. Catch `KeyboardInterrupt` at the loop level → break cleanly, preserving all logs written so far.
8. Print **batch summary** (Arch §5.1):
   ```text
   Total Targets Evaluated: 5
     - Emails Sent        : 1
     - Drafts Created     : 3
     - Skipped Outreach   : 1
     - Failed Operations  : 0
   ```

**Error handling** (Arch §8):
- Per-contact exceptions are caught and logged as `failed`; pipeline continues to next contact.
- Fatal config errors (missing `.env`) abort with actionable terminal message.
- Never silently drop a user-confirmed send.

### Verification
- Pipe `"skip\nskip\nskip\nskip\nskip"` into `main.py` → assert 5 skipped, 0 sent/drafted/failed.
- Pipe `"draft\nsend\nskip\ndraft\nsend"` → assert mixed metrics in batch summary.
- Verify `Ctrl+C` during loop exits gracefully with partial summary.

---

## Phase 5 — Email Sender Adapters (DryRun + SMTP)

> **Arch references:** §5.5 (email_sender.py), §7 (Safety — DRY_RUN default), §8 (Error Handling — SMTP auth), §9 (Deployment), §15 (Security — TLS)

### Objective
Implement the pluggable delivery layer with an abstract base, a safe dry-run mock, and a real SMTP sender using `smtplib`.

### Deliverables

#### [NEW] `email_sender.py`

**Data model:**
```python
@dataclass
class DeliveryResult:
    status: Literal["drafted", "sent", "failed"]
    provider_message_id: str | None
    error: str | None
```

**Adapter pattern** (Arch §5.5):
```text
EmailSender (base class)
    ├── DryRunEmailSender     # DRY_RUN=true — no network
    ├── SmtpEmailSender       # smtplib + STARTTLS
    └── GmailApiEmailSender   # stretch goal
```

**`DryRunEmailSender`:**
- Returns `DeliveryResult(status="drafted"|"sent", provider_message_id="DRY-RUN-MSG-ID", error=None)`.
- Makes zero network calls.
- Still runs through the full preview + confirmation flow (Arch §5.5 — for teaching purposes).

**`SmtpEmailSender`:**
1. Validate `smtp_user` and `smtp_password` are non-empty; return `failed` with clear error if missing.
2. Construct `MIMEMultipart` message with `From`, `To`, `Subject`, plain-text body.
3. Connect to `SMTP(smtp_host, smtp_port)`.
4. Upgrade to TLS via `starttls()` (Arch §15 — Transport security).
5. Login with `smtp_user` / `smtp_password`.
6. **Draft mode behavior:** Since pure SMTP has no native "save as draft" capability, send the email to `SMTP_USER` (self) with subject prefixed `[DRAFT REVIEW]`. This lets the operator review it in their own inbox before forwarding.
7. **Send mode behavior:** Send to `contact.recipient_email` directly.
8. `server.quit()`.
9. Catch `smtplib.SMTPAuthenticationError` → return `failed` with hint about Gmail App Passwords (Arch §8).
10. Catch all other exceptions → return `failed` with `str(e)`.

**Identity binding** (Arch §7):
- `From` header always uses `config.sender_name` + `config.smtp_user` — no spoofing.

### Verification
- `DryRunEmailSender.deliver(mode="draft")` → assert `status == "drafted"`, `error is None`.
- `DryRunEmailSender.deliver(mode="send")` → assert `status == "sent"`, `error is None`.
- `SmtpEmailSender` with empty credentials → assert `status == "failed"`, error mentions "Missing".
- Full integration with `DRY_RUN=true` in `main.py` → assert no network calls made.

---

## Phase 6 — Audit Logger

> **Arch references:** §5.6 (logger.py), §6.3 (LogEntry), §8 (Error Handling — always write a log row)

### Objective
Implement the append-only CSV audit trail that records every outreach attempt, regardless of outcome.

### Deliverables

#### [NEW] `logger.py`

**Public interface:**
```python
def append_log(
    contact: Contact,
    draft: EmailDraft,
    status: str,
    error_message: str = "",
    path: str = "outreach_log.csv"
) -> None:
```

**CSV columns** (Arch §5.6):

| Column | Source |
|--------|--------|
| `timestamp` | `datetime.datetime.utcnow().isoformat() + "Z"` |
| `recipient_email` | `contact.recipient_email` |
| `company` | `contact.company` |
| `role` | `contact.role` |
| `subject` | `draft.subject` |
| `status` | `generated` / `drafted` / `sent` / `skipped` / `failed` |
| `error_message` | Empty string if success |

**Properties** (Arch §5.6):
- **Append-only:** Never overwrite existing rows.
- **Auto-create:** If file does not exist, write header row first.
- **Safe CSV escaping:** Use `csv.writer` with `quoting=csv.QUOTE_ALL` to handle commas, quotes, and newlines in email content.
- **File-lock fallback:** Catch `PermissionError` (e.g., file open in Excel on Windows) → write to `outreach_log_backup.txt` with structured text format and print `WARNING`.

**Error principle** (Arch §8):
- Always write a log row for attempted outreach — even if delivery failed.
- Logger itself must never crash the pipeline; catch and warn on all exceptions.

### Verification
- Append one entry to a fresh file → assert file exists with header + 1 data row.
- Append another entry → assert 2 data rows (header not duplicated).
- Verify CSV quoting: inject a subject with commas and quotes → assert proper escaping.

---

## Phase 7 — End-to-End Integration, Testing & Proof

> **Arch references:** §12 (Acceptance Criteria), §13 (Demo Build Order), §14 (Testing Strategy)

### Objective
Run full integration tests, verify all acceptance criteria, produce proof artifacts, and write the project README.

### Deliverables

#### [NEW] `README.md`
- Project description and purpose.
- Setup instructions: clone, `pip install -r requirements.txt`, copy `.env.example` to `.env`, configure credentials.
- Gmail App Password setup guide.
- Usage: `python main.py`.
- Configuration reference table.
- Safety notes.

#### Integration Test Matrix (Arch §14)

| Test | Command / Method | Expected Result |
|------|------------------|-----------------|
| **Dry-run full batch** | `python main.py` with `DRY_RUN=true`, pipe 5x `"draft"` | 5 drafted, 0 failed, log has 5 rows |
| **Mixed actions** | Pipe `"draft\nsend\nskip\ndraft\nsend"` | 2 sent, 2 drafted, 1 skipped |
| **Word count guard** | Check all 5 generated drafts | All `word_count <= 150` |
| **Template fallback** | Remove `GROQ_API_KEY` from `.env` | Generator uses deterministic template |
| **Groq integration** | Set `GROQ_API_KEY` | Generator produces refined output; still `<= 150` words |
| **Invalid contact skip** | Add record with empty `recipient_email` to JSON | Record skipped with `WARNING`, others processed |
| **Empty credentials** | Set `SMTP_PASSWORD=""`, `DRY_RUN=false` | Returns `failed` status with clear error |
| **Ctrl+C handling** | Interrupt mid-batch | Graceful exit, partial logs preserved |
| **Log integrity** | Inspect `outreach_log.csv` after run | Proper headers, ISO timestamps, quoted fields |

#### Proof Artifacts (Arch §12, §13)
1. `outreach_log.csv` with 5+ entries showing mixed statuses.
2. Terminal output screenshot showing batch summary.
3. (For live send) Gmail Sent/Drafts folder screenshot.

### Acceptance Criteria Verification (Arch §12)

| Criterion | How to verify |
|-----------|---------------|
| >= 5 personalized emails | Run with 5 contacts in `contacts.json` |
| Subject + body | Inspect `EmailDraft` fields |
| Company/role personalization | Confirm company and role appear in generated body |
| Preview before send | Run `main.py` and observe preview output before prompt |
| Send or draft successfully | Check batch summary for sent/drafted counts |
| Log each attempt | Open `outreach_log.csv` |
| Proof via Sent/Drafts | Screenshot after `DRY_RUN=false` live send to self |

---

## Phase 8 — Stretch Goals

> **Arch references:** §11 (MVP vs Stretch Architecture)

These extend the MVP without changing `main.py`'s core orchestration contract.

| Stretch Feature | New / Modified File | Arch Addition | Priority |
|-----------------|--------------------|--------------:|----------|
| **Gmail draft creation** | `gmail_sender.py` | `GmailApiEmailSender` adapter | High |
| **CSV file upload** | `input_loader.py` | Add `load_csv_targets()` branch | Medium |
| **Streamlit UI** | `ui/app.py` | Calls same pipeline functions | Medium |
| **Groq LLM rewriting** | `email_generator.py` | `GroqEmailGenerator` + `EmailQualityValidator` | **Done** |
| **Quality / spam score** | `quality_scorer.py` | Post-processor plugin before preview | Low |
| **Multiple subject lines** | `email_generator.py` | Generator returns `list[str]`, user picks in preview | Low |
| **Follow-up emails** | `followup_generator.py` | New module + log links via `parent_id` | Low |
| **Deduplication** | `recipient_registry.py` | `RecipientRegistry` reading past log emails | Low |
| **Opt-out filter** | `opt_out_filter.py` | `do_not_contact.csv` check before loop (Arch §7) | Medium |

### Gmail API Draft Mode (High Priority Stretch)
```text
GmailApiEmailSender
  ├── Uses google-api-python-client
  ├── OAuth2 scoped to gmail.compose / gmail.send
  ├── Creates real Gmail draft via API (appears in Drafts folder)
  └── Falls back to SmtpEmailSender on OAuth failure
```

### Opt-Out Filter (Arch §7 — Safety)
```python
def load_opt_outs(path: str = "do_not_contact.csv") -> set[str]:
    """Returns set of email addresses to exclude."""

def filter_targets(contacts: list[Contact], opt_outs: set[str]) -> list[Contact]:
    """Removes contacts whose email appears in opt-out list."""
```

---

## Acceptance Criteria Traceability

> Full mapping from Arch §12.

| # | Criterion | Phase | Module | Verification |
|---|-----------|-------|--------|--------------|
| 1 | >= 5 personalized emails | 2, 3 | `contacts.json`, `email_generator.py` | 5 records in JSON; all generate valid drafts |
| 2 | Subject + body | 3 | `email_generator.py` | `EmailDraft` has both fields |
| 3 | Company/role personalization | 3 | `email_generator.py` | Template interpolates `{company}` and `{role}` |
| 4 | Preview before send | 4 | `preview.py`, `main.py` | Preview always shown before `prompt_action()` |
| 5 | Send or draft successfully | 5 | `email_sender.py` | `DeliveryResult.status` in `("drafted", "sent")` |
| 6 | Log each attempt | 6 | `logger.py` | Every contact produces a row in `outreach_log.csv` |
| 7 | Proof via Sent/Drafts | 7 | External | Gmail screenshot after live send |

---

## Security Checklist

> From Arch §15.

- [ ] `.env` is listed in `.gitignore` — never committed
- [ ] `.env.example` contains no real secrets
- [ ] `DRY_RUN=true` is the default in `.env.example`
- [ ] SMTP uses STARTTLS on port 587
- [ ] Gmail OAuth tokens scoped to `gmail.compose` / `gmail.send` minimum (stretch)
- [ ] `outreach_log.csv` treated as local PII-sensitive file
- [ ] Volume cap (`MAX_OUTREACH_PER_RUN`) + human confirmation prevents accidental bulk send
- [ ] `SENDER_NAME` / `SMTP_USER` binding prevents deceptive identity
- [ ] Groq prompt explicitly forbids hallucination of facts

---

## Summary

This plan implements **The Closer** as a **linear, human-in-the-loop CLI pipeline** across 8 phases:

1. **Skeleton** — config, models, dependencies
2. **Input** — contact loading + validation
3. **Generation** — template + Groq LLM
4. **CLI** — preview, confirmation, orchestrator
5. **Delivery** — dry-run + SMTP adapters
6. **Logging** — append-only CSV audit trail
7. **Integration** — testing, proof, README
8. **Stretch** — Gmail API, CSV upload, Streamlit, follow-ups, deduplication

Each phase produces a standalone, testable artifact. The MVP can be demonstrated after Phase 6. Phase 7 formalizes testing and proof. Phase 8 extends capabilities without breaking the core pipeline.
