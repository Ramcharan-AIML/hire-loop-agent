# 🔁 HireLoop

**Discover. Tailor. Reach out. — your whole job hunt in one loop.**

HireLoop unifies three previously-separate agents into a single platform that takes
you from *"find relevant jobs"* all the way to *"send a tailored, approved outreach
email"* — with no manual copy-paste between tools.

```
 Discover ─────────►  Tailor ──────────►  Outreach ─────────►  Done
 (find jobs)         (fit resume to JD)   (draft + approve)     (audit log)
```

---

## What's inside

| Component | Role | Tech | Source project |
|-----------|------|------|----------------|
| **Job Agent** | Scrapes & normalizes job listings (Naukri, RemoteOK, Wellfound) | Python · FastAPI · Firecrawl/Playwright | `job-agent-real` |
| **Resume Engine + BFF** | Tailors résumé to the JD; also the unified UI & orchestrator | Next.js 16 · Groq/Gemini | `resume-shapeshifter-agent` |
| **Cold Mail** | Generates & sends personalized outreach with a human-approval gate | Python · FastAPI · Groq · SMTP | `cold_mail_sender` |

The three original projects are vendored under `services/` and `frontend/` and wrapped
behind clean HTTP contracts. See [docs/architecture.md](docs/architecture.md).

## Repository layout

```
.
├── docs/                      # problem statement, architecture, implementation plan
├── packages/contracts/        # shared JSON schemas (JobRecord, Contact, EmailDraft)
├── services/
│   ├── job-agent/             # FastAPI wrapper + vendored job-agent-real
│   └── cold-mail/             # FastAPI wrapper + vendored cold_mail_sender
├── frontend/                  # Next.js app: UI + BFF (vendored resume-shapeshifter)
├── docker-compose.yml         # runs both Python services locally
├── render.yaml                # Render blueprint for the two services
└── RUNBOOK.md                 # run / configure / deploy guide
```

## Quick start

```bash
# 1. Python services
docker compose up -d --build
bash scripts/smoke.sh

# 2. Frontend
cd frontend && npm install && npm run dev
# open http://localhost:3000
```

Full setup, env vars, deployment, and the safety model are in **[RUNBOOK.md](RUNBOOK.md)**.

## Safety by default

- **Human-in-the-loop:** outreach won't send without explicit approval (`409` otherwise).
- **Dry-run by default:** no real email unless `DRY_RUN=false` is set deliberately.
- **Volume cap** on real sends, and an **internal API key** between the frontend and services.

## Configuration

All secrets live in gitignored `.env` files (templates: `*.env.example`). **Never commit real keys.**
Required: `FIRECRAWL_API_KEY`, `GROQ_API_KEY`, Gmail SMTP App Password, and a shared `INTERNAL_API_KEY`.
