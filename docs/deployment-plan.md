# Deployment Plan — HireLoop

How to take HireLoop from local to publicly live. Companion to [../RUNBOOK.md](../RUNBOOK.md).

---

## 1. The key constraint (read first)

HireLoop has **two runtimes** that deploy to **two different platforms**:

| Part | Deploys to | Why |
|------|-----------|-----|
| **Frontend + BFF** (`frontend/`, Next.js) | **Vercel** | Native fit; serverless route handlers are fine here. |
| **Job Agent** (`services/job-agent`, Python) | **Render** (container) | Needs real **Chromium/Playwright** + long scrapes — **cannot run on Vercel serverless**. |
| **Cold Mail** (`services/cold-mail`, Python) | **Render** (container) | Long-lived SMTP service; pairs with Job Agent. |

> ⚠️ Deploying *only* Vercel gives a half-working app: the **Tailor** step works
> (pure Next.js + Groq), but **Discover** and **Outreach** call the Python
> services. So we deploy the **Python services first**, then point Vercel at them.

```
                 ┌──────────────── Vercel ────────────────┐
   Browser ────► │  HireLoop frontend + BFF (Next.js)      │
                 └───────┬───────────────────────┬─────────┘
                         │ HTTPS                  │ HTTPS
                 ┌───────▼────────┐      ┌────────▼─────────┐
                 │ Job Agent (Render) │  │ Cold Mail (Render) │
                 └────────────────┘      └──────────────────┘
```

---

## 2. Order of operations

1. **Deploy Python services to Render** → get 2 public URLs.
2. **Deploy frontend to Vercel** with those URLs as env vars.
3. **Verify** the live end-to-end flow.

---

## 3. Step A — Python services on Render

Prereqs: the repo is on GitHub (`Ramcharan-AIML/hire-loop-agent`) ✅, and
[../render.yaml](../render.yaml) is committed ✅.

1. Go to **render.com → New → Blueprint**.
2. Connect GitHub and select **`hire-loop-agent`**. Render reads `render.yaml`
   and proposes two services: **job-agent** and **cold-mail**.
3. Click **Apply**. Then open each service → **Environment** and set the secrets
   (marked `sync:false` in the blueprint):

   **job-agent**
   - `FIRECRAWL_API_KEY` = your Firecrawl key
   - `INTERNAL_API_KEY` = the shared secret (same value used everywhere)

   **cold-mail**
   - `GROQ_API_KEY`, `SMTP_USER`, `SMTP_PASSWORD`, `SENDER_NAME`
   - `INTERNAL_API_KEY` = **same** value as job-agent
   - leave `DRY_RUN=true` for now

4. Wait for both to build (job-agent pulls the Playwright image — a few minutes)
   and go **healthy** (`/healthz`). Copy the public URLs, e.g.:
   - `https://hireloop-job-agent.onrender.com`
   - `https://hireloop-cold-mail.onrender.com`

> Plan: use **Starter** (not Free) for job-agent — Chromium needs the RAM. Free
> instances also cold-start/sleep, which makes the first scrape time out.

**Verify Render directly:**
```bash
curl https://hireloop-job-agent.onrender.com/healthz       # {"status":"ok"}
curl -X POST https://hireloop-job-agent.onrender.com/search \
  -H "Content-Type: application/json" -H "X-Internal-Key: <KEY>" \
  -d '{"role":"python","sources":["RemoteOK"],"limit":2}'
```

---

## 4. Step B — Frontend on Vercel

The frontend is a **subdirectory** of the monorepo, so set the root directory.

### Option 1 — Vercel dashboard (simplest)
1. **vercel.com → Add New → Project** → import `hire-loop-agent`.
2. **Root Directory** → set to **`frontend`**. (Framework auto-detects Next.js.)
3. **Environment Variables** (Production + Preview):
   | Key | Value |
   |-----|-------|
   | `JOB_AGENT_URL` | the Render job-agent URL |
   | `COLD_MAIL_URL` | the Render cold-mail URL |
   | `INTERNAL_API_KEY` | the same shared secret |
   | `GROQ_API_KEY` | your Groq key (for the tailor step) |
   | `LLM_PROVIDER` | `groq` |
   | `LLM_MODEL` | `llama-3.3-70b-versatile` |
4. **Deploy.** Vercel runs `next build` (verified passing locally) and gives a URL
   like `https://hire-loop-agent.vercel.app`.

### Option 2 — Vercel CLI (from `frontend/`)
```bash
cd frontend
npx vercel login
npx vercel link            # link/create the project
# add env vars:
npx vercel env add JOB_AGENT_URL production
npx vercel env add COLD_MAIL_URL production
npx vercel env add INTERNAL_API_KEY production
npx vercel env add GROQ_API_KEY production
npx vercel env add LLM_PROVIDER production      # groq
npx vercel env add LLM_MODEL production         # llama-3.3-70b-versatile
npx vercel --prod
```

---

## 5. Step C — Verify the live deployment

1. Open the Vercel URL → **Launch Platform**.
2. **Discover:** search `python` (RemoteOK) → real jobs appear (proves Vercel → Render job-agent).
3. **Tailor:** pick a job, paste/upload a résumé → Analyze runs (proves Groq on Vercel).
4. **Outreach:** enter a recruiter email → Generate → Approve (dry-run) → **Done** shows the audit record (proves Vercel → Render cold-mail + gate).

`curl` smoke against production:
```bash
curl -X POST https://<your-app>.vercel.app/api/jobs/search \
  -H "Content-Type: application/json" -d '{"role":"python","sources":["RemoteOK"],"limit":2}'
```

---

## 6. Production notes & gotchas

- **Vercel function timeout:** `vercel.json` sets `maxDuration: 60`. On the **Hobby**
  plan 60s is the ceiling — fine for RemoteOK, but multi-page Naukri+Firecrawl can
  exceed it. Mitigate: keep `NAUKRI_PAGES` low, prefer RemoteOK for demos, or use Vercel Pro.
- **CORS:** not needed — the browser only talks to same-origin Vercel BFF routes;
  only the server-side BFF calls Render (with the internal key).
- **Secrets:** set only in the platform dashboards. Never commit real `.env`
  (already enforced by `.gitignore`).
- **Going live with real email:** set `DRY_RUN=false` (and `SEND_MODE=send`) on the
  Render cold-mail service only when ready; keep `MAX_OUTREACH_PER_RUN` small.
- **Cold starts:** Render Free sleeps; first request after idle is slow. Use Starter
  to avoid scrape timeouts.

---

## 7. Rollback

- **Vercel:** Deployments tab → promote a previous deployment.
- **Render:** service → Events/Deploys → roll back to a prior deploy.
