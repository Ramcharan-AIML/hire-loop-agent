# The Closer — Cold Email Writer + Send Bot

**The Closer** is a safe-by-default, modular, human-in-the-loop cold email generation and delivery CLI tool written in Python. It parses outreach targets, dynamically writes highly personalized job outreach drafts using templates or **Groq LLM refinement (llama-3.1-8b-instant)**, displays interactive terminal previews for operator approval, performs safe delivery via dry-run or TLS-secure SMTP, and logs every outreach attempt into an append-only CSV audit trail.

---

## Features

- **Safe-by-Default Guardrails**: 
  - Starts in `DRY_RUN=true` mode to protect you from accidentally triggering any live email delivery.
  - Hard volume cap constraints (`MAX_OUTREACH_PER_RUN`) to prevent bulk spam sending.
  - **Human-in-the-loop validation gate** requires explicit user approval (`send`, `draft`, or `skip`) before delivering any email draft.
- **Dynamic Groq LLM Refinement**: Refines standard f-string cold email templates into highly engaging, natural, warm job inquiries under a strict **150-word ceiling** without hallucinating or inventing any facts not present in the base profile.
- **Identity Binding & Secure Transports**: Real sending forces standard STARTTLS security and displays your authentic sender name alongside your authenticated user account, maintaining sender reputation.
- **Fail-Safe Auditing CSV Logs**: Logs every attempt (timestamp, recipient, company, role, subject, status, error details) to `outreach_log.csv`. Falls back to an offline structured text log if the CSV is locked (e.g. open in Excel).

---

## Repository Layout

```text
the-closer/
├── .env.example            # Standard config knobs with safe defaults
├── .env                    # Operator's live credentials (gitignored)
├── .gitignore              # Ignores sensitive credentials, logs, and caches
├── requirements.txt        # Application library dependencies
├── config.py               # Config dataclass + defensive env loader
├── models.py               # Contact, EmailDraft, and LogEntry models
├── contacts.json           # Sample contact outreach targets (5 records)
├── input_loader.py         # Reads and validates contacts (gracefully skips bad rows)
├── email_generator.py      # Produces templates or Groq LLM-refined drafts
├── preview.py              # Visual terminal review card and operator prompt
├── email_sender.py         # Mock DryRun adapter and live SMTP delivery adapter
├── logger.py               # Append-only audit logger with CSV-locking fallback
├── main.py                 # Core CLI orchestrator & E2E batch runner
└── docs/
    ├── problemStatement.md
    ├── architecture.md
    └── implementation_plan.md
```

---

## Installation & Setup

### 1. Prerequisites
- Python 3.10 or higher.
- A Groq Cloud account and API Key (optional, if you want LLM rewriting).
- A Gmail account with 2-Factor Authentication enabled and an **App Password** generated (if you want live SMTP delivery).

### 2. Install Dependencies
Clone the repository and install the required modules from the root folder:
```bash
pip install -r requirements.txt
```

### 3. Configure the Environment
Copy the example configuration to a live `.env` file:
```bash
cp .env.example .env
```

Open `.env` and configure your settings:
```ini
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_16_character_app_password

# Display Name in From header
SENDER_NAME=Your Full Name

# Safety Switches
DRY_RUN=true               # Set to 'false' to enable live email delivery
SEND_MODE=draft            # 'draft' sends email to SMTP_USER prefixed [DRAFT REVIEW]
                           # 'send' delivers email to contact.recipient_email directly

MAX_OUTREACH_PER_RUN=5     # Restricts the maximum number of targets processed per batch

# Inputs and LLM Configuration
INPUT_PATH=contacts.json
GROQ_API_KEY=your_groq_api_key_here
LLM_PROVIDER=groq
LLM_MODEL=llama-3.1-8b-instant
```

> [!IMPORTANT]
> **Gmail App Password Setup Guide**:
> To acquire a `SMTP_PASSWORD`:
> 1. Go to your Google Account Settings.
> 2. Ensure **2-Step Verification** is enabled under the Security tab.
> 3. Search for "App Passwords" in the search bar.
> 4. Enter a name (e.g. `The Closer`) and click **Create**.
> 5. Copy the 16-character code generated and paste it into the `SMTP_PASSWORD` field in `.env` (without any spaces).

---

## Usage

Start the interactive cold outreach terminal wizard:
```bash
python main.py
```

### Prompt Choices
For each outreach target, the application will display a pretty-printed review card containing candidate profile metrics and the draft's subject and body:
1. `send`: Deliver or draft the outreach depending on your `SEND_MODE` settings.
2. `draft`: Deliver to yourself as a preview draft review (SMTP_USER inbox).
3. `skip`: Safely bypass the target without sending anything.

---

## Configuration Knobs Reference

| Environment Variable | Datatype / Allowed Values | Default Value | Purpose |
|----------------------|---------------------------|---------------|---------|
| `SMTP_HOST` | String | `smtp.gmail.com` | SMTP Server domain. |
| `SMTP_PORT` | Integer | `587` | Server connection port (STARTTLS). |
| `SMTP_USER` | String (Email Address) | *(empty)* | Authenticating sender email account. |
| `SMTP_PASSWORD`| String (App Password) | *(empty)* | App authentication credential. |
| `SENDER_NAME` | String | *(empty)* | Friendly display name in email headers. |
| `DRY_RUN` | Boolean (`true` / `false`)| `true` | Offline mock safety gate indicator. |
| `SEND_MODE` | `"draft"` / `"send"` | `"draft"` | Routing delivery targets on active sending. |
| `MAX_OUTREACH_PER_RUN` | Integer | `5` | Batch volume cap boundary. |
| `INPUT_PATH` | String (File path) | `contacts.json` | JSON input file containing contact rows. |
| `GROQ_API_KEY` | String | *(empty)* | Active Groq authorization token. |
| `LLM_MODEL` | String | `llama-3.1-8b-instant` | Refinement LLM engine selection. |

---

## Security & Ethics Envelope

- **Opt-In Reviews**: No communication is ever triggered without human oversight. Every single letter requires live console validation.
- **Authentication Bindings**: Spoofing is blocked. The `From` header binds your friendly display name to your authentic validated user login.
- **Factual Restraints**: Groq system parameters restrict models from generating fabricated skill sets, job claims, or connection references.
- **Encrypted Transports**: All SMTP handshakes upgrade via standard STARTTLS cryptographic envelopes on port 587.
