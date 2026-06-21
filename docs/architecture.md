# Architecture — HireLoop (Unified AI Job Application Platform)

> Companion to [problemstatement.md](problemstatement.md). This document defines
> the detailed technical architecture for combining the three existing projects
> into one platform.

---

## 1. Design Principles

1. **Reuse, don't rewrite.** Each of the three projects keeps its own repo,
   language, and provider choices. We wrap and orchestrate them, not replace them.
2. **One frontend, many services.** The user sees a single web app; behind it,
   each project runs as an independent service with a clean HTTP contract.
3. **The Next.js app is the hub.** Project 2 (Resume Shapeshifter) is already a
   deployed web app *with API routes* — it becomes the frontend **and** the
   orchestration layer (Backend-for-Frontend).
4. **Close the deployment gap.** Project 1 (Job Agent) is the only undeployed
   component; the architecture turns it into a hosted HTTP service so all three
   are live.
5. **Human-in-the-loop is non-negotiable.** The cold-email send always passes
   through an explicit approval gate, dry-run by default.
6. **Contract-first.** A shared JSON data contract flows between every stage so
   no manual copy-paste is required.

---

## 2. System Context (C4 Level 1)

```
                                  ┌─────────────────────────────────────────┐
                                  │              The Candidate                │
                                  │        (single user / demo scope)         │
                                  └──────────────────────┬────────────────────┘
                                                         │  HTTPS (browser)
                                                         ▼
                          ┌──────────────────────────────────────────────────┐
                          │     UNIFIED PLATFORM  (Next.js on Vercel)         │
                          │  Resume Shapeshifter app = Frontend + BFF/Orch.   │
                          └───────┬───────────────────┬──────────────────┬────┘
                                  │ REST              │ in-process        │ REST
                                  ▼                   ▼ API routes        ▼
              ┌───────────────────────────┐  ┌──────────────────┐  ┌───────────────────────────┐
              │  JOB AGENT SERVICE         │  │ RESUME ENGINE     │  │  COLD MAIL SERVICE         │
              │  (NEW FastAPI wrapper)     │  │ (existing Next.js │  │  (FastAPI wrapper around   │
              │  around job-agent-real     │  │  /api/* routes)   │  │  cold_mail_sender)         │
              │  Python · Firecrawl/       │  │ Groq + Google     │  │  Python · Groq · SMTP      │
              │  Playwright/BeautifulSoup  │  │ GenAI · PDF       │  │                            │
              └───────────┬───────────────┘  └──────────────────┘  └───────────┬───────────────┘
                          │                                                     │
            ┌─────────────┴───────────┐                              ┌──────────┴──────────┐
            ▼             ▼            ▼                              ▼                     ▼
        Naukri        RemoteOK     Wellfound                    Groq LLM API          SMTP (Gmail
       (Firecrawl)  (Firecrawl)  (Playwright)                                          STARTTLS)
```

External dependencies: **Firecrawl API**, **Groq API**, **Google Generative AI**,
**SMTP relay (Gmail App Password)**.

---

## 3. Component Architecture (C4 Level 2)

### 3.1 Job Agent Service  *(NEW — closes the deployment gap)*

| Aspect | Detail |
|--------|--------|
| Source | `job-agent-real` (Python 3.10+) |
| Today | CLI only: `python -m src.main --role ... --location ...` |
| Change | Add a thin **FastAPI** layer that calls the existing `orchestrator.py` instead of `main.py`'s argparse path. **No scraping logic rewritten.** |
| Internal modules (reused) | `src/scrapers/`, `src/exporters/`, `src/models/job.py`, `src/orchestrator.py`, `src/config.py` |
| Output | Returns the existing `Job` records as JSON (instead of writing CSV); CSV export kept as an optional endpoint. |
| Deployment | Container (the repo has none yet → add `Dockerfile`) on a host that allows Playwright/Chromium (Render / Railway / Fly.io / a small VM). **Vercel serverless is unsuitable** because of Playwright + long-running scrapes. |

**Why a separate service and not a Next.js route:** scraping needs a real
browser (Chromium), long timeouts, and the existing Python scraper stack.
Those don't fit Vercel's serverless model — hence a dedicated long-lived
container.

### 3.2 Resume Engine  *(EXISTING — already deployed)*

| Aspect | Detail |
|--------|--------|
| Source | `resume-shapeshifter-agent` (Next.js 16 / React 19, TypeScript) |
| Existing API routes | `/api/parse-resume`, `/api/parse-jd`, `/api/gap-analysis`, `/api/score`, `/api/tailor`, `/api/generate-pdf` |
| LLM | Groq SDK + Google Generative AI |
| Doc handling | `pdf-parse`, `mammoth` (DOCX), `@react-pdf/renderer` (PDF out) |
| State / validation | `zustand`, `zod` |
| Role in platform | **Frontend + Orchestrator (BFF).** Its UI flow (`input → analyze → review → export`) becomes the platform's central workflow; new pages/steps for *discover jobs* and *send outreach* are added that call the two Python services. |

### 3.3 Cold Mail Service  *(EXISTING app, gets an API wrapper)*

| Aspect | Detail |
|--------|--------|
| Source | `cold_mail_sender` ("The Closer", Python 3.10+, already Docker-ready) |
| Today | Interactive CLI wizard (`python main.py`) with terminal approval prompts |
| Change | Add a **FastAPI** layer exposing `generate` (draft) and `send` (deliver) as two separate calls, so the **approval gate moves to the web UI** instead of the terminal. Reuse `email_generator.py`, `email_sender.py`, `logger.py`, `models.py`. |
| Models reused | `Contact`, `EmailDraft`, `LogEntry` |
| Safety preserved | Dry-run default, per-batch volume caps, audit CSV log — all kept; approval becomes an explicit UI action between `generate` and `send`. |

---

## 4. Shared Data Contract

The platform's backbone is a set of JSON shapes passed between stages. These are
derived directly from the existing models in each repo.

### 4.1 `JobRecord` (from `src/models/job.py`)

```jsonc
{
  "job_title":    "string",
  "company":      "string",
  "location":     "string",
  "salary":       "string",        // optional in practice
  "experience":   "string",
  "skills":       "string",
  "job_url":      "string",
  "source":       "Naukri | RemoteOK | Wellfound",
  "date_posted":  "string",
  "date_scraped": "YYYY-MM-DD HH:MM:SS"
}
```

### 4.2 `TailoredResume` (output of `/api/tailor` + `/api/generate-pdf`)

```jsonc
{
  "job_ref":        "job_url or internal id",
  "tailored_text":  "string (resume tailored to the JD)",
  "match_score":    0.0,            // from /api/score
  "gaps":           ["string"],     // from /api/gap-analysis
  "pdf_url":        "string"        // from /api/generate-pdf
}
```

### 4.3 `Contact` (from cold_mail_sender `models.py`)

```jsonc
{
  "recipient_email":      "string (required)",
  "company":              "string (required)",
  "role":                 "string (required)",
  "candidate_name":       "string (required)",
  "candidate_background": "string (required)",
  "recipient_name":       "string | null",
  "job_url":              "string | null",
  "portfolio_url":        "string | null",
  "personalization_note": "string | null",
  "linkedin_url":         "string | null",
  "resume_link":          "string | null"
}
```

### 4.4 The Integration Gap (important)

`JobRecord` **has no recruiter `recipient_email` / `recipient_name`**, but the
cold mailer's `Contact` **requires** them. So a stage cannot flow straight from
job → email. The platform must bridge this with a **Contact-Enrichment step**:

- **MVP:** the UI asks the user to enter the recruiter email (and optional name)
  for a chosen job before drafting the email.
- **Later:** an enrichment service/integration auto-discovers recruiter contacts.

Field mapping that *is* automatic:

| Contact field | Source |
|---------------|--------|
| `company`, `role`, `job_url` | `JobRecord.company`, `.job_title`, `.job_url` |
| `candidate_name`, `candidate_background` | candidate profile (from parsed resume) |
| `personalization_note` | derived from JD / gap-analysis |
| `resume_link` | `TailoredResume.pdf_url` |
| `recipient_email`, `recipient_name` | **user-supplied (enrichment gap)** |

---

## 5. End-to-End Flow (sequence)

```
User        Next.js (BFF)        Job Agent Svc      Resume Engine        Cold Mail Svc
 │  search query  │                   │                  │                    │
 ├───────────────►│  POST /search     │                  │                    │
 │                ├──────────────────►│  scrape (3 srcs) │                    │
 │                │◄──────────────────┤  JobRecord[]     │                    │
 │◄───────────────┤  job list         │                  │                    │
 │ pick job +     │                   │                  │                    │
 │ upload resume  │                   │                  │                    │
 ├───────────────►│  /api/parse-resume, /api/parse-jd ──►│                    │
 │                ├──────────────────────────────────────►│ /api/tailor,      │
 │                │                                        │ /score, /gap,     │
 │                │◄───────────────────────────────────────┤ /generate-pdf    │
 │◄───────────────┤  TailoredResume + score + gaps        │                    │
 │ enter recruiter│                   │                  │                    │
 │ email; "draft" │                   │                  │                    │
 ├───────────────►│  POST /outreach/generate ────────────────────────────────►│  build EmailDraft (Groq)
 │                │◄───────────────────────────────────────────────────────────┤  EmailDraft (subject/body/wc)
 │◄───────────────┤  show draft for APPROVAL              │                    │
 │  approve ✔     │                   │                  │                    │
 ├───────────────►│  POST /outreach/send (approved=true) ─────────────────────►│  SMTP STARTTLS + LogEntry
 │                │◄───────────────────────────────────────────────────────────┤  status: sent
 │◄───────────────┤  confirmation + audit log id          │                    │
```

The **approval gate** sits between `/outreach/generate` and `/outreach/send`.
`send` refuses unless `approved=true` (and respects dry-run / volume caps).

---

## 6. API Specifications

### 6.1 Job Agent Service (new FastAPI)

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `POST` | `/search` | `{ "role": str, "location": str, "sources?": ["Naukri",...], "headless?": bool, "limit?": int }` | `{ "jobs": JobRecord[] }` |
| `GET`  | `/healthz` | — | `{ "status": "ok" }` |
| `GET`  | `/export.csv?...` | (optional) | CSV stream (legacy parity) |

### 6.2 Resume Engine (existing routes, reused)

| Path | Purpose |
|------|---------|
| `POST /api/parse-resume` | resume (PDF/DOCX) → structured text |
| `POST /api/parse-jd` | job description → structured requirements |
| `POST /api/gap-analysis` | resume vs JD → missing skills |
| `POST /api/score` | match score |
| `POST /api/tailor` | produce tailored resume |
| `POST /api/generate-pdf` | tailored resume → PDF |

### 6.3 Cold Mail Service (new FastAPI)

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `POST` | `/generate` | `Contact` (+ optional tone/template) | `EmailDraft` |
| `POST` | `/send` | `{ "contact": Contact, "draft": EmailDraft, "approved": bool, "dry_run?": bool }` | `LogEntry` |
| `GET`  | `/log` | — | `LogEntry[]` (audit trail) |
| `GET`  | `/healthz` | — | `{ "status": "ok" }` |

### 6.4 BFF Orchestration (Next.js, new routes)

| Path | Calls | Purpose |
|------|-------|---------|
| `POST /api/jobs/search` | Job Agent `/search` | proxy + auth + caching |
| `POST /api/outreach/generate` | Cold Mail `/generate` | builds `Contact` from session, requests draft |
| `POST /api/outreach/send` | Cold Mail `/send` | forwards approval, enforces gate |

---

## 7. Frontend Architecture

Extend the existing Next.js route flow (`input → analyze → review → export`) into
a 4-stage wizard:

```
/discover   →   /tailor   →   /outreach   →   /done
(job search)   (resume fit)  (draft+approve)  (sent + audit log)
```

- **State:** existing `zustand` store extended to hold `selectedJob`,
  `tailoredResume`, and `contact` across steps.
- **Validation:** `zod` schemas for `JobRecord`, `Contact`, `EmailDraft` shared
  between client and BFF routes.
- **Reuse:** `/discover` is new; `/tailor` reuses the current analyze/review/export
  screens; `/outreach` is new and renders the `EmailDraft` in an approval card
  (Send / Save Draft / Skip) mirroring the CLI's original gate.

---

## 8. Deployment Architecture

| Component | Platform | Notes |
|-----------|----------|-------|
| Resume Engine + BFF | **Vercel** (already there) | unchanged hosting; add new routes + env vars |
| Job Agent Service | **Container host** (Render / Railway / Fly.io / VM) | **NEW deployment** — needs Chromium for Playwright; serverless won't work. Add `Dockerfile` with `playwright install chromium`. |
| Cold Mail Service | **Container host** (reuse existing Dockerfile) | already Docker-ready; deploy alongside Job Agent |
| Secrets | platform env vars | never in repo |

```
Internet ──► Vercel (Next.js: UI + BFF + Resume API)
                 │
                 ├── HTTPS ──► Job Agent Service  (container, Chromium)   [NEW]
                 └── HTTPS ──► Cold Mail Service   (container)            [wrapped]
```

This satisfies the problem statement's core requirement: **the Job Agent goes
from "not deployed" to a live HTTPS service**, reaching parity with the other two.

---

## 9. Configuration & Secrets

| Variable | Used by |
|----------|---------|
| `FIRECRAWL_API_KEY` | Job Agent Service |
| `GROQ_API_KEY` | Resume Engine + Cold Mail Service |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Resume Engine |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` (Gmail App Password) | Cold Mail Service |
| `SENDER_EMAIL` / `SENDER_NAME` | Cold Mail Service |
| `DRY_RUN` (default `true`), `MAX_EMAILS_PER_RUN` | Cold Mail Service |
| `JOB_AGENT_URL`, `COLD_MAIL_URL` | Next.js BFF (service discovery) |
| `INTERNAL_API_KEY` | shared secret BFF ↔ Python services |

---

## 10. Cross-Cutting Concerns

- **Security:** Python services are not public-facing UIs — protect them with a
  shared `INTERNAL_API_KEY` checked in middleware; only the BFF calls them.
  SMTP creds and API keys live in env vars only.
- **Human-in-the-loop:** enforced server-side — `/send` returns `403`/`409` if
  `approved != true`; `DRY_RUN=true` is the default and must be explicitly
  overridden.
- **Rate / abuse limits:** keep the cold mailer's per-run volume cap; add basic
  rate limiting on `/search` (scraping is slow and bot-detected).
- **Resilience:** Job Agent keeps its 3-tier fallback (Firecrawl → Playwright →
  local HTML). Services expose `/healthz` for the BFF to degrade gracefully.
- **Observability:** keep the cold mailer's audit CSV log; surface it at
  `/outreach` done screen. Add structured request logs on each service.
- **Error handling:** BFF normalizes upstream errors into user-friendly states
  (e.g. "scraping blocked, try again", "email not sent — approval required").

---

## 11. Repository Strategy

Two viable options:

| Option | Description | Recommendation |
|--------|-------------|----------------|
| **A. Keep 3 repos + a 4th "platform" repo** | platform repo holds BFF additions, infra/compose, docs | ✅ Lowest churn; respects "reuse don't rewrite" |
| **B. Monorepo** | merge all three under one repo with `apps/` workspaces | More cohesive but high migration cost |

**Recommended: Option A**, with a `docker-compose.yml` in the platform repo that
runs Job Agent + Cold Mail services locally for development, and the Next.js app
pointed at them via `JOB_AGENT_URL` / `COLD_MAIL_URL`.

```
final_project/                 (this platform repo)
├── docs/
│   ├── problemstatement.md
│   └── architecture.md
├── docker-compose.yml         # job-agent + cold-mail for local dev
├── services/
│   ├── job-agent/             # FastAPI wrapper + git submodule/clone of job-agent-real
│   └── cold-mail/             # FastAPI wrapper + clone of cold_mail_sender
└── (frontend = resume-shapeshifter-agent, deployed on Vercel)
```

---

## 12. Phased Roadmap

1. **Phase 0 — Contracts:** finalize `JobRecord` / `TailoredResume` / `Contact`
   `zod`/`pydantic` schemas; agree on the enrichment gap handling.
2. **Phase 1 — Deploy Job Agent:** add FastAPI + `Dockerfile`, deploy to a
   container host. *(Closes the deployment gap.)*
3. **Phase 2 — Wrap Cold Mailer:** add FastAPI `generate`/`send`, split the
   approval gate out of the CLI, deploy.
4. **Phase 3 — BFF + UI:** add `/api/jobs/search`, `/api/outreach/*` routes and
   the `/discover` + `/outreach` wizard steps to the Next.js app.
5. **Phase 4 — End-to-end:** wire the full flow, enforce approval + dry-run,
   surface the audit log.
6. **Phase 5 — Hardening:** internal API auth, rate limits, health checks, docs.

---

## 13. Risks & Open Decisions

| Risk / Decision | Notes |
|-----------------|-------|
| **Recruiter contact discovery** | Job records lack emails; MVP = manual entry, future = enrichment. |
| **Scraping reliability** | Bot-detection on Naukri/Wellfound; Playwright host must allow Chromium; budget for Firecrawl. |
| **Cold-email compliance** | Keep volume caps + dry-run; respect anti-spam norms; this is outreach, not bulk mail. |
| **Two LLM providers** (Groq + Google) | Acceptable; both already used by Resume Engine. |
| **Cost** | Firecrawl + Groq + container hosting; keep to single-user/demo scope first. |
| **Resume profile source** | `candidate_background` for the email should come from the parsed resume, not re-entered. |
