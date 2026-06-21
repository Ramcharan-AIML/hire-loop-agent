# RUNBOOK — HireLoop

Operational guide for running, configuring, and deploying the platform.
See [docs/architecture.md](docs/architecture.md) for the design and
[docs/implementation-plan.md](docs/implementation-plan.md) for the build phases.

---

## 1. Components

| Component | Tech | Port (local) | Deploy target |
|-----------|------|--------------|---------------|
| Job Agent Service | Python · FastAPI · Firecrawl/Playwright | 8000 | Container host (Render/Railway/Fly) |
| Cold Mail Service | Python · FastAPI · Groq · SMTP | 8001 | Container host |
| Frontend + BFF | Next.js 16 (Resume Engine + orchestrator) | 3000 | Vercel |

Pipeline: **Discover → Tailor → Outreach → Done**
(Job Agent → Resume Engine → Cold Mail).

---

## 2. Prerequisites

- Docker Desktop (for the two Python services)
- Node.js 20+ and npm (for the frontend)
- API keys: **Firecrawl**, **Groq**; Gmail **App Password** for SMTP.

---

## 3. Environment Variables

| Variable | Service | Notes |
|----------|---------|-------|
| `INTERNAL_API_KEY` | all | Shared secret; **must be identical** in all three. Invented by us, not from a provider. |
| `FIRECRAWL_API_KEY` | job-agent | https://www.firecrawl.dev |
| `PLAYWRIGHT_HEADLESS` | job-agent | `true` on servers |
| `GROQ_API_KEY` | cold-mail + frontend | https://console.groq.com/keys |
| `LLM_PROVIDER` / `LLM_MODEL` | cold-mail + frontend | `groq` / model id |
| `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD` | cold-mail | Gmail App Password, not your login password |
| `SENDER_NAME` | cold-mail | Display name on outgoing mail |
| `DRY_RUN` | cold-mail | **`true` by default**; `false` only to send real email |
| `SEND_MODE` | cold-mail | `draft` (to self) or `send` (to recipient) |
| `MAX_OUTREACH_PER_RUN` | cold-mail | Per-run real-send cap |
| `JOB_AGENT_URL` / `COLD_MAIL_URL` | frontend | Where the BFF reaches the services |

Env file locations (all gitignored):
`./.env` (compose), `services/job-agent/.env`, `services/cold-mail/.env`,
`frontend/.env.local`. Templates: the matching `.env.example` files.

---

## 4. Run Locally

```bash
# 1. Python services (from repo root)
docker compose up -d --build
bash scripts/smoke.sh          # both should report healthy

# 2. Frontend
cd frontend
npm install
npm run dev                    # http://localhost:3000
```

Open http://localhost:3000 → **Launch Platform** → Discover → Tailor → Outreach → Done.

Stop: `docker compose down` and Ctrl-C the dev server.

---

## 5. Deploy

### 5a. Python services → Render (Blueprint)
1. Push this repo to GitHub.
2. Render → **New → Blueprint** → select the repo. It reads [render.yaml](render.yaml)
   and creates `job-agent` + `cold-mail` web services.
3. Fill the `sync:false` secrets in the dashboard (`FIRECRAWL_API_KEY`,
   `GROQ_API_KEY`, `SMTP_*`, `SENDER_NAME`, and the shared `INTERNAL_API_KEY`).
4. Wait for both `/healthz` to go green. Note their public URLs.

> Job Agent needs the Playwright/Chromium image — use the `starter` plan or larger
> (the free tier lacks RAM). **Vercel serverless cannot run it.**

### 5b. Frontend → Vercel
1. Import the `frontend/` project in Vercel.
2. Set env vars: `JOB_AGENT_URL` and `COLD_MAIL_URL` = the Render URLs,
   `INTERNAL_API_KEY` = the same shared secret, plus `GROQ_API_KEY`/`LLM_*`.
3. Deploy. The BFF routes (`/api/jobs/*`, `/api/outreach/*`) now reach the services.

---

## 6. Safety Model (do not bypass)

- **Approval gate:** `/api/outreach/send` and the Python `/send` both reject
  `approved != true` with `409`. The UI "Approve & Send" sets it explicitly.
- **Dry-run default:** `DRY_RUN=true` → no real email; status returns `drafted`/mock.
- **Volume cap:** real (non-dry-run) sends beyond `MAX_OUTREACH_PER_RUN` → `429`.
- **Internal auth:** services reject calls without the correct `X-Internal-Key` (`401`).

### Going live (real email)
1. Set `DRY_RUN=false` (and `SEND_MODE=send`) on the cold-mail service.
2. Send to a **test inbox you control** first.
3. Keep `MAX_OUTREACH_PER_RUN` small; respect anti-spam norms.

---

## 7. Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| Tailor step: "Internal server error while parsing resume" | `GROQ_API_KEY` missing in `frontend/.env.local`; add it and restart `npm run dev`. |
| `/api/jobs/search` 401 | `INTERNAL_API_KEY` mismatch between frontend and job-agent. |
| Search returns 0 jobs | RemoteOK matcher needs all tokens — try a single keyword; ensure `FIRECRAWL_API_KEY` is set for Naukri. |
| `Could not reach the ... service` | Service down or wrong `JOB_AGENT_URL`/`COLD_MAIL_URL`; check `docker compose ps`. |
| Email not sent | Expected if `DRY_RUN=true`; or check Gmail App Password / SMTP creds. |
| Port 3000 in use | A stale `next dev` is running; kill the PID it reports, then `npm run dev`. |

Logs: `docker compose logs job-agent` / `cold-mail`. Audit trail of outreach:
`GET /log` on cold-mail, or `services/cold-mail/cold_mail_sender/outreach_log.csv`.
