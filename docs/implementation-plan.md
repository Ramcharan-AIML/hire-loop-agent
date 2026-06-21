# Implementation Plan — HireLoop (Unified AI Job Application Platform)

> Execution companion to [architecture.md](architecture.md) and
> [problemstatement.md](problemstatement.md). This is the step-by-step plan to
> **start building**. Tasks are ordered so each phase produces something runnable.

---

## 0. Conventions & Definition of Done

- **Repo strategy:** Option A from the architecture — this `final_project/` repo
  is the *platform* repo. The three original apps are cloned/submoduled under
  `services/` (Python) and the Next.js app stays its own deployed repo.
- **Every service must ship:** a `/healthz` endpoint, a `Dockerfile`, an
  `.env.example`, and a one-line run command.
- **A task is "done"** only when its **Acceptance check** passes (a concrete
  curl/command, not "looks right").
- **Secrets never committed.** Only `.env.example` is tracked.

---

## 1. Target Repository Layout

```
final_project/
├── docs/
│   ├── problemstatement.md
│   ├── architecture.md
│   └── implementation-plan.md      ← this file
├── docker-compose.yml              ← runs job-agent + cold-mail locally
├── .env.example                    ← top-level (compose) env template
├── packages/
│   └── contracts/                  ← shared schemas (source of truth)
│       ├── job_record.schema.json
│       ├── contact.schema.json
│       └── email_draft.schema.json
└── services/
    ├── job-agent/                  ← FastAPI wrapper + job-agent-real
    │   ├── app/main.py
    │   ├── app/schemas.py
    │   ├── Dockerfile
    │   ├── requirements.txt
    │   └── job_agent_real/         ← clone/submodule of the original repo
    └── cold-mail/                  ← FastAPI wrapper + cold_mail_sender
        ├── app/main.py
        ├── app/schemas.py
        ├── Dockerfile
        ├── requirements.txt
        └── cold_mail_sender/       ← clone/submodule of the original repo
```

The **frontend** (`resume-shapeshifter-agent`) is edited in its own repo; this
plan lists the changes to make there in Phase 4.

---

## Phase 0 — Project Setup & Contracts  *(½ day)*

Goal: scaffolding + a single source of truth for the data shapes, before any
service code.

### Tasks
1. **Init platform repo skeleton**
   - Create `services/`, `packages/contracts/`, top-level `.env.example`,
     `docker-compose.yml` (empty stubs for now).
   - `git init` (the workspace is not yet a git repo).
2. **Vendor the three source repos**
   ```bash
   git clone https://github.com/Ramcharan-AIML/job-agent-real.git    services/job-agent/job_agent_real
   git clone https://github.com/Ramcharan-AIML/cold_mail_sender.git  services/cold-mail/cold_mail_sender
   ```
   (Use submodules instead of clones if you want to track upstream.)
3. **Write the JSON Schemas** in `packages/contracts/` for `JobRecord`,
   `Contact`, `EmailDraft` exactly as defined in architecture §4. These are the
   contract both Python (`pydantic`) and TS (`zod`) sides must match.
4. **Document the enrichment gap decision** (architecture §4.4) at the top of
   `contact.schema.json` as a comment: `recipient_email` is user-supplied in MVP.

### Acceptance
- `tree services packages` shows the layout above.
- The three schema files exist and match architecture §4 field-for-field.

---

## Phase 1 — Job Agent Service (closes the deployment gap)  *(2 days)*

Goal: turn the CLI-only `job-agent-real` into a live HTTP service. **Highest
priority** — it's the one undeployed component.

### Tasks
1. **Inspect the real entry points** in `job_agent_real/src/`:
   - confirm `orchestrator.py`'s callable function (the one `main.py` invokes
     after argparse) and the `Job` model in `models/job.py`.
2. **FastAPI wrapper** — `services/job-agent/app/main.py`:
   ```python
   from fastapi import FastAPI, Header, HTTPException
   from .schemas import SearchRequest, SearchResponse
   # import the existing orchestrator without modifying it
   from job_agent_real.src.orchestrator import run_search  # adjust to real name

   app = FastAPI(title="Job Agent Service")

   @app.get("/healthz")
   def healthz(): return {"status": "ok"}

   @app.post("/search", response_model=SearchResponse)
   def search(req: SearchRequest, x_internal_key: str = Header(default="")):
       _auth(x_internal_key)
       jobs = run_search(role=req.role, location=req.location,
                         sources=req.sources, headless=req.headless,
                         limit=req.limit)
       return {"jobs": [j.__dict__ for j in jobs]}
   ```
3. **Pydantic schemas** — `app/schemas.py`: `SearchRequest` (role, location,
   sources?, headless?, limit?) and `JobRecord`/`SearchResponse` mirroring the
   contract.
4. **Internal-auth guard** — reject requests whose `X-Internal-Key` ≠
   `INTERNAL_API_KEY` (architecture §10).
5. **Dockerfile** with Chromium for Playwright:
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt && playwright install --with-deps chromium
   COPY . .
   CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```
6. **`.env.example`**: `FIRECRAWL_API_KEY=`, `INTERNAL_API_KEY=`.
7. **Deploy** to a container host that allows Chromium (Render / Railway /
   Fly.io). **Not Vercel** (architecture §3.1).

### Acceptance
- Local: `curl localhost:8000/healthz` → `{"status":"ok"}`.
- Local: `POST /search {"role":"Python Developer","location":"Bengaluru"}`
  returns a non-empty `jobs[]` matching `JobRecord`.
- **Deployed:** the same curl works against the public HTTPS URL → *deployment
  gap closed.*

---

## Phase 2 — Cold Mail Service (API + split approval gate)  *(2 days)*

Goal: wrap `cold_mail_sender` so the approval gate becomes two HTTP calls
(`generate` then `send`) instead of a terminal prompt — without losing any safety.

### Tasks
1. **Map the reusable functions** in `cold_mail_sender/`:
   `email_generator.py` (draft), `email_sender.py` (SMTP + dry-run),
   `logger.py` (audit CSV), `models.py` (`Contact`/`EmailDraft`/`LogEntry`).
2. **FastAPI wrapper** — `services/cold-mail/app/main.py`:
   - `POST /generate` → builds `EmailDraft` via `email_generator` (no send).
   - `POST /send` → **refuses unless `approved == true`**; honors `DRY_RUN`
     default and `MAX_EMAILS_PER_RUN`; calls `email_sender`; writes `LogEntry`.
   - `GET /log` → returns the audit trail.
   - `GET /healthz`.
   ```python
   @app.post("/send")
   def send(body: SendRequest, x_internal_key: str = Header(default="")):
       _auth(x_internal_key)
       if not body.approved:
           raise HTTPException(409, "approval required")  # human-in-the-loop gate
       return send_email(body.contact, body.draft, dry_run=body.dry_run)
   ```
3. **Preserve safety defaults**: `DRY_RUN=true` unless explicitly overridden;
   keep per-run volume cap (architecture §10).
4. **Dockerfile / .env.example**: reuse the repo's existing Dockerfile; env =
   `GROQ_API_KEY`, `SMTP_*`, `SENDER_*`, `DRY_RUN`, `MAX_EMAILS_PER_RUN`,
   `INTERNAL_API_KEY`.
5. **Deploy** alongside the Job Agent on the container host.

### Acceptance
- `POST /generate` with a valid `Contact` → `EmailDraft {subject, body, word_count}`.
- `POST /send {approved:false}` → `409 approval required` (gate works).
- `POST /send {approved:true, dry_run:true}` → `LogEntry status:"drafted"`, **no
  real email sent**, audit row appended.
- `GET /log` shows the attempt.

---

## Phase 3 — Local Orchestration (docker-compose)  *(½ day)*

Goal: both Python services runnable together for development.

### Tasks
1. **`docker-compose.yml`** with `job-agent` (port 8000) and `cold-mail`
   (port 8001), each reading its `.env`, both on a shared network.
2. **Top-level `.env.example`** documenting every variable from architecture §9.
3. **Smoke script** (`scripts/smoke.sh`) hitting both `/healthz` endpoints.

### Acceptance
- `docker compose up` brings up both; `scripts/smoke.sh` reports both healthy.

---

## Phase 4 — BFF + Frontend Wizard (in resume-shapeshifter-agent)  *(3–4 days)*

Goal: the Next.js app becomes the single UI + orchestrator. Done in that repo.

### Tasks
1. **Service-discovery env**: add `JOB_AGENT_URL`, `COLD_MAIL_URL`,
   `INTERNAL_API_KEY` to the Next.js project (Vercel env vars).
2. **Shared zod schemas** mirroring `packages/contracts/` for `JobRecord`,
   `Contact`, `EmailDraft` (architecture §7).
3. **New BFF routes** (server-side; attach `X-Internal-Key`):
   - `POST /api/jobs/search` → proxies Job Agent `/search`.
   - `POST /api/outreach/generate` → builds `Contact` from session state, calls
     Cold Mail `/generate`.
   - `POST /api/outreach/send` → forwards `approved` to Cold Mail `/send`.
4. **Extend the zustand store** to hold `selectedJob`, `tailoredResume`,
   `contact` across steps.
5. **New wizard steps** (reuse existing analyze/review/export for `/tailor`):
   - `/discover` — search form → job results table → "select job".
   - `/outreach` — recruiter-email input (the enrichment gap, §4.4) + draft
     preview as an **approval card** (Send / Save Draft / Skip).
   - `/done` — confirmation + audit log view.
6. **Auto-fill mapping** (architecture §4.4 table): pre-populate `Contact`
   (`company`, `role`, `job_url`, `candidate_*`, `resume_link`, `personalization_note`)
   so the user only supplies the recruiter email.

### Acceptance
- From the deployed UI: search → returns jobs.
- Select a job → tailor flow produces a `TailoredResume` + score + gaps.
- Enter recruiter email → draft appears → **Approve** sends (dry-run first) →
  `/done` shows the audit entry. No copy-paste anywhere in the flow.

---

## Phase 5 — End-to-End Hardening  *(2 days)*

### Tasks
1. **Enforce gates server-side** end-to-end: `approved` + `DRY_RUN` honored from
   UI → BFF → Cold Mail.
2. **Internal API auth** verified on both Python services; reject missing key.
3. **Rate limiting** on `/api/jobs/search` (scraping is slow/bot-detected, §10).
4. **Graceful degradation**: BFF surfaces friendly errors ("scraping blocked",
   "approval required") using each service's `/healthz`.
5. **Flip to live send** intentionally: set `DRY_RUN=false` and do one real,
   approved send to a test inbox.
6. **Docs**: update READMEs + a `RUNBOOK.md` (env vars, deploy steps, how to run
   the full flow).

### Acceptance
- Full path from query → real (approved) email to a test inbox, with audit log.
- Negative tests pass: no key → rejected; not approved → not sent; over volume
  cap → blocked.

---

## Dependency / Sequencing Summary

```
Phase 0 ──► Phase 1 (Job Agent, deploy)  ─┐
        └─► Phase 2 (Cold Mail, deploy)  ─┼─► Phase 3 (compose) ─► Phase 4 (BFF+UI) ─► Phase 5 (harden)
                                          ┘
```

- Phases 1 and 2 are **independent** and can run in parallel.
- Phase 4 depends on 1 + 2 being reachable (locally via Phase 3 is enough to start).

---

## First 5 Concrete Actions (start here)

1. `git init` the platform repo and create the `services/` + `packages/contracts/` skeleton (Phase 0.1).
2. Clone the three source repos into place (Phase 0.2).
3. Write the three JSON schema files from architecture §4 (Phase 0.3).
4. Stand up the Job Agent FastAPI `/healthz` + `/search` locally against the existing orchestrator (Phase 1.1–1.4).
5. Confirm with `curl` that `/search` returns real `JobRecord`s — then containerize and deploy (Phase 1.5–1.7).

---

## Open Items to Confirm Before/During Build

| Item | Needed for | Default if unanswered |
|------|-----------|----------------------|
| Container host choice (Render / Railway / Fly.io) | Phase 1 & 2 deploy | Render (simple Docker + Chromium support) |
| Submodule vs clone for vendored repos | Phase 0 | Clone (simpler) |
| Recruiter-email enrichment (manual vs API) | Phase 4 | Manual entry (MVP, §4.4) |
| Live-send go/no-go for the demo | Phase 5 | Dry-run only until explicitly flipped |
