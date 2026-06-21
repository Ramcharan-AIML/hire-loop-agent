# Problem Statement — HireLoop (Unified AI Job Application Platform)

## 1. Background

Over the course of this program we built three independent agents, each solving
one slice of the job-hunting workflow:

| # | Project | Repository | What it does | Stack | Deployment status |
|---|---------|-----------|--------------|-------|-------------------|
| 1 | **Job Agent (Real)** | [job-agent-real](https://github.com/Ramcharan-AIML/job-agent-real.git) | Searches, scrapes, normalizes and exports job listings from Naukri, RemoteOK and Wellfound into a unified CSV. | Python 3.10+ CLI · Firecrawl API · Playwright · BeautifulSoup | **NOT deployed** (runs locally as a CLI) |
| 2 | **Resume Shapeshifter Agent** | [resume-shapeshifter-agent](https://github.com/Ramcharan-AIML/resume-shapeshifter-agent.git) | AI agent that tailors / re-shapes a resume to match a specific job description. | Next.js + TypeScript web app | **Deployed** — Vercel (`resume-shapeshifter-agent.vercel.app`) |
| 3 | **Cold Mail Sender ("The Closer")** | [cold_mail_sender](https://github.com/Ramcharan-AIML/cold_mail_sender.git) | Generates personalized cold outreach emails (template or Groq LLM) with a human-approval gate, then delivers them over secure SMTP with audit logging. | Python 3.10+ CLI · Groq `llama-3.1-8b-instant` · SMTP/STARTTLS · Docker | **Deployed** (Dockerfile + dev container) |

Each project works well on its own, but the user has to manually carry data
between them: export jobs to CSV from Project 1, copy each job description into
Project 2 to tailor a resume, then manually feed recruiter contacts into
Project 3 to send outreach. The handoffs are manual, lossy, and slow.

## 2. The Problem

> There is no single platform that takes a candidate from **"find relevant jobs"**
> all the way to **"send a tailored application and outreach email"** without
> manual copy-paste between three disconnected tools.

We need to **combine all three projects into one unified platform** that runs the
full pipeline end-to-end:

```
            ┌──────────────────┐     ┌────────────────────────┐     ┌──────────────────────┐
  user  →   │ 1. Job Agent     │ →   │ 2. Resume Shapeshifter │ →   │ 3. Cold Mail Sender  │  → outreach sent
  query     │  (discover jobs) │     │  (tailor resume / JD)  │     │  (write + send email)│
            └──────────────────┘     └────────────────────────┘     └──────────────────────┘
                   jobs.csv                 tailored resume               personalized email
```

1. **Discover** — user enters a natural-language query (e.g. "Python developer
   roles in Bengaluru"); the Job Agent scrapes and returns a normalized list of
   jobs.
2. **Tailor** — for a selected job, the Resume Shapeshifter rewrites the
   candidate's resume to match the job description.
3. **Reach out** — the Cold Mail Sender drafts a personalized outreach email
   for the recruiter/contact, shows it for human approval, and sends it.

## 3. Goals

- **Single entry point / unified UI** for the entire job-application journey.
- **Automated data flow** between stages — job data flows into resume tailoring,
  and both flow into the outreach email; no manual copy-paste.
- **Preserve each project's strengths**: resilient multi-source scraping,
  AI resume adaptation, and safe human-in-the-loop email sending.
- **Keep the human-in-the-loop safety gate** of the cold mailer (review before
  send, dry-run by default, volume caps).
- **One coherent deployment** so the whole platform is usable online, not just
  as three separate local tools.

## 4. Key Challenge: Mixed Tech Stacks & Deployment Status

The three projects are **not uniform**, which is the central integration
challenge:

- **Two different languages**: Projects 1 and 3 are **Python CLIs**; Project 2
  is a **Next.js/TypeScript web app**.
- **Two different runtime models**: CLI tools vs. a hosted web frontend.
- **Different deployment maturity** — this is explicitly called out:
  - ✅ **Resume Shapeshifter** is already deployed (Vercel).
  - ✅ **Cold Mail Sender** is already deployed (Docker-ready).
  - ❌ **Job Agent (Real)** is **NOT yet deployed** — it only runs locally as a
    CLI today.

> **Therefore a core requirement of this platform is to also get the Job Agent
> deployed** (e.g. wrapped behind an API/service) so all three components are
> live and reachable from the unified platform — bringing the one undeployed
> project up to parity with the other two.

## 5. Proposed Approach (high level)

- Expose Projects 1 and 3 (Python CLIs) as **services/APIs** (e.g. FastAPI
  wrappers) so they can be called programmatically instead of via the terminal.
  - In particular, **deploy the Job Agent** as a hosted service to close the
    deployment gap.
- Use the existing **Next.js app (Project 2)** as the foundation of the unified
  frontend, or build a thin orchestration UI that calls all three services.
- Define a **shared data contract** between stages:
  - Job Agent → outputs normalized job records (the existing CSV/JSON schema:
    title, company, location, salary, experience, skills, JD, contact).
  - Resume Shapeshifter → consumes a job record + base resume, outputs a
    tailored resume.
  - Cold Mail Sender → consumes job record + tailored resume + contact, outputs
    an approved, sent email with an audit log entry.
- Deploy the combined platform as **one coherent system** (frontend + the
  backing services), keeping API keys (Firecrawl, Groq, SMTP) in environment
  configuration.

## 6. Success Criteria

1. A user can go from a job search query to a sent, tailored outreach email
   **within a single platform**, no manual file shuffling.
2. **All three components are deployed and reachable** — including the Job Agent,
   which is currently undeployed.
3. Data passes automatically between the three stages via a shared contract.
4. The human-approval safety gate of the cold mailer is retained.
5. The platform is documented and reproducible (env config, run instructions).

## 7. Out of Scope (for now)

- Rewriting any of the three projects from scratch — we **reuse and integrate**
  existing code.
- Replacing the scraping/LLM/SMTP providers already chosen in each project.
- Multi-tenant accounts / billing (single-user / demo scope first).
