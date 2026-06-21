# HireLoop — Concepts Explained (Beginner Friendly)

A plain-English guide to **every concept** used to build and deploy HireLoop:
microservices, Docker, CI/CD, Hugging Face, Vercel, environment/secrets, and the
**complete end-to-end flow** of the project.

> Read top-to-bottom the first time. After that, use it as a glossary.

---

## 0. The 30-second summary

HireLoop is **one product made of three separate programs** that talk to each
other over the internet:

| # | Program | Job | Language | Lives on |
|---|---------|-----|----------|----------|
| 1 | **Frontend (HireLoop UI)** | What you see + the "traffic controller" | Next.js (TypeScript) | **Vercel** |
| 2 | **Job Agent** | Finds & scrapes jobs | Python (FastAPI) | **Hugging Face** |
| 3 | **Cold Mail** | Writes & sends outreach emails | Python (FastAPI) | **Hugging Face** |

These three pieces are **microservices**. Each runs inside a **Docker container**.
**Hugging Face** and **Vercel** are the clouds that host them. The process of
getting code from your laptop to those clouds is **deployment** (and when it's
automated, it's called **CI/CD**).

The rest of this doc explains each of those bolded words.

---

## 1. Monolith vs Microservices

### The old way: a "monolith"
Imagine one giant program that does *everything* — scrapes jobs, tailors resumes,
sends email, and serves the website — all in a single codebase running as one unit.
That's a **monolith**. It's simple to start, but:
- If one part crashes, the whole thing goes down.
- You can't use the best tool for each job (everything must be one language).
- Updating one feature means redeploying the entire app.

### The HireLoop way: "microservices"
Instead, we split the product into **small, independent services**, each doing
**one thing** and talking to the others through a well-defined web API (HTTP).

```
                 ┌─────────────────────────────┐
   You ───────►  │  Frontend (Next.js on Vercel)│  ← the only thing you visit
                 │  also acts as orchestrator   │
                 └───────┬─────────────┬────────┘
                         │ HTTPS       │ HTTPS
                 ┌───────▼──────┐ ┌────▼─────────┐
                 │  Job Agent   │ │  Cold Mail   │   ← independent services
                 │  (Python)    │ │  (Python)    │
                 └──────────────┘ └──────────────┘
```

**Why this is good for HireLoop:**
- The scraper needs **Python** (Firecrawl, Playwright). The website is best in
  **Next.js**. Microservices let each use the right language.
- If the scraper is slow or breaks, the email service and website keep working.
- We could update the email logic without touching the scraper.

**The trade-off:** more moving parts to deploy and secure (which is exactly why
we need Docker, secrets management, and a deployment process — covered below).

### The "BFF" (Backend-for-Frontend)
Our frontend is special: besides drawing the UI, it also acts as a
**traffic controller** that calls the two Python services on the browser's behalf.
This pattern is called **Backend-for-Frontend**. The browser only ever talks to
the frontend; the frontend talks to the services. (This keeps the secret key off
the browser — see Security.)

In code, these are the "BFF routes": `/api/jobs/search`, `/api/outreach/generate`,
`/api/outreach/send`.

---

## 2. APIs (so the rest makes sense)

An **API** (Application Programming Interface) is just **a way for one program to
ask another program to do something**, over the internet, using HTTP.

- A **request** says *"please do X"* (e.g. `POST /search` with `{role: "python"}`).
- A **response** comes back with the result (e.g. a list of jobs as JSON).
- **JSON** is the text format used to carry the data (`{"key": "value"}`).

In HireLoop:
- The frontend sends `POST /search` to the Job Agent → gets jobs back.
- The frontend sends `POST /generate` to Cold Mail → gets an email draft back.

Each service also has a **`/healthz`** endpoint that just replies "ok" — used to
check *"is this service alive?"*

---

## 3. Docker — the heart of "it works everywhere"

### The problem Docker solves
*"It works on my machine"* is the classic developer nightmare. Your laptop has
Python 3.13, certain libraries, Chromium installed, specific settings… The server
might have none of that. So code that runs locally breaks in the cloud.

### What Docker is
**Docker packages your app + everything it needs to run into a single, portable
box called a container.** That box runs *identically* on your laptop, on Hugging
Face, on any cloud — because it carries its own mini operating system, the right
Python version, all libraries, and the browser.

> Analogy: A **shipping container**. It doesn't matter what's inside or which
> ship/truck/port handles it — the container is standardized, so it just works
> anywhere. Docker did this for software.

### The 4 Docker words you need

| Term | What it is | Analogy |
|------|-----------|---------|
| **Dockerfile** | A recipe: text file with step-by-step build instructions | The recipe card |
| **Image** | The built, frozen package (recipe → finished meal, vacuum-sealed) | The frozen ready-meal |
| **Container** | A running instance of an image | The meal heated up and being eaten |
| **Registry** | A storage/sharing place for images (Docker Hub, etc.) | The supermarket freezer aisle |

So the lifecycle is: **write a Dockerfile → build it into an Image → run the Image
as a Container.**

### HireLoop's actual Dockerfile (Cold Mail), line by line

```dockerfile
FROM python:3.11-slim          # 1. Start from a base image: a tiny Linux with Python 3.11
WORKDIR /app                   # 2. Work inside the /app folder in the container
COPY requirements.txt .        # 3. Copy the list of Python libraries needed
RUN pip install -r requirements.txt   # 4. Install those libraries INTO the image
COPY app ./app                 # 5. Copy our FastAPI wrapper code in
COPY cold_mail_sender ./cold_mail_sender   # 6. Copy the original email program in
ENV DRY_RUN=true               # 7. Default setting: don't send real email (safety)
EXPOSE 8001                    # 8. This app listens on port 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]  # 9. The command to start it
```

The **Job Agent's** Dockerfile is similar, but it starts `FROM` a special
**Playwright image** that already contains the **Chromium browser** — because the
scraper sometimes needs a real browser to get past anti-bot defenses. (Installing
Chromium ourselves kept crashing the build, so using a base image that already has
it is the robust fix.)

### What is `docker-compose`?
Running one container is `docker run`. But HireLoop has **two** Python services.
**Docker Compose** is a tool to run *multiple* containers together with one
command, described in a `docker-compose.yml` file. Ours starts the Job Agent (port
8000) and Cold Mail (port 8001) side by side for **local development**.

```bash
docker compose up      # starts both services
docker compose down    # stops them
```

### What is a "port"?
A **port** is like an apartment number for a program on a machine. The machine has
one address; ports let many programs share it. Job Agent = port 8000, Cold Mail =
8001, the website = 3000. The browser reaches a service via `address:port`.

### What is `.dockerignore`?
Like `.gitignore` but for Docker. It tells the build *"don't copy these into the
image"* — e.g. the huge `.venv` folder and the secret `.env` file. Keeps images
small and safe.

---

## 4. Environment variables & Secrets (very important)

### The concept
Your code needs **configuration** that changes between your laptop and the cloud:
API keys, passwords, service URLs. You should **never hard-code these into the
source code** (anyone reading the code would steal your keys).

Instead, you put them in **environment variables** — values the operating system
hands to your program at runtime. Code reads them like:
```python
os.getenv("GROQ_API_KEY")
```

### Two kinds
- **Local:** a `.env` file on your machine (gitignored, never committed).
- **Cloud:** each platform has a **secret store** in its dashboard/API where you
  paste the values. The platform injects them into the running container as
  environment variables.

### The golden rule (this answers your earlier question!)
> **Code is public. Secrets are injected separately at runtime.**

That's why Hugging Face never asked for your keys when creating the Space:
creating a Space just stores the *code*. The keys were added **separately** to
HF's encrypted secret store (by our script), and only appear *inside the running
container* as environment variables. They are in **none** of the public files.

This is enforced by our `.gitignore`, which blocks every real `.env` file from
ever reaching GitHub. We triple-checked this before pushing.

### HireLoop's secrets
`FIRECRAWL_API_KEY`, `GROQ_API_KEY`, Gmail `SMTP_PASSWORD`, and a shared
`INTERNAL_API_KEY` (a password we invented so only our frontend can call our
services — random people on the internet get a `401 Unauthorized`).

---

## 5. CI/CD — automating the path from code to cloud

### What the letters mean
- **CI = Continuous Integration:** every time you change code, it's automatically
  **built and tested** to catch breakage early.
- **CD = Continuous Delivery/Deployment:** that tested code is automatically
  **pushed to the cloud** (deployed), so users get it without manual steps.

Together, **CI/CD = an automated assembly line from "I changed code" to "it's
live."**

### The typical CI/CD flow (stages)

```
 ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
 │  CODE  │──►│ BUILD  │──►│  TEST  │──►│ DEPLOY │──►│ MONITOR│
 │ (push) │   │(compile│   │(checks)│   │(to     │   │(logs/  │
 │        │   │/Docker)│   │        │   │ cloud) │   │ health)│
 └────────┘   └────────┘   └────────┘   └────────┘   └────────┘
```

1. **Code:** you `git push` your change to GitHub.
2. **Build:** the platform compiles the app / builds the Docker image.
3. **Test:** run automated checks (type-checks, linting, unit tests).
4. **Deploy:** publish the build to the live URL.
5. **Monitor:** watch logs and `/healthz` to confirm it's healthy; roll back if not.

### What HireLoop actually uses
We have **automated CD built into the platforms** (this is the modern, simple form
of CI/CD — you don't always need a separate tool):

- **Vercel (frontend):** connected to GitHub. The moment code lands, Vercel
  **automatically runs `next build` (CI) and deploys (CD)**. If the build fails,
  it won't publish — that's the "test/quality gate" protecting production.
- **Hugging Face (Python services):** when code is uploaded to a Space, HF
  **automatically rebuilds the Docker image and restarts the container.**

So our CI/CD flow in practice is:
```
git push  →  Vercel auto-builds & deploys the UI
upload    →  Hugging Face auto-builds & runs each service
```

> A "full" CI/CD setup would add **GitHub Actions** (a separate robot that runs
> tests on every push before deploying). HireLoop is small, so we rely on each
> platform's built-in build+deploy. The `next build` we ran locally before
> deploying *is* the "CI test" step done by hand.

---

## 6. The clouds: what Vercel and Hugging Face actually do

### Vercel (hosts the frontend)
- A platform specialized in hosting **websites and serverless functions** (Next.js
  is made by Vercel).
- It builds the Next.js app, serves it on a fast global network, and runs the BFF
  API routes as small on-demand functions.
- Gave us the public URL: **https://hire-loop-agent.vercel.app**
- **Why not the Python services here?** Vercel's functions are short-lived and
  can't run a full Chromium browser or long scrapes — so the Python services need
  a different home.

### Hugging Face Spaces (hosts the Python services) — its role
Hugging Face is best known for AI models, but **Spaces** is its app-hosting product.
For HireLoop, its role is: **run our two Docker containers for free, as live web
services.**

What HF does for us, specifically:
1. **Reads the Space's `README.md`** frontmatter (`sdk: docker`, `app_port: 8000`)
   to know *"this is a Docker app on this port."*
2. **Builds the Docker image** from our Dockerfile (pulls Python/Chromium, installs
   libraries).
3. **Injects the secrets** we set (Firecrawl/Groq/SMTP/internal key) as environment
   variables into the running container.
4. **Runs the container** and gives it a public HTTPS URL, e.g.
   `https://ramcharanaiml-hireloop-job-agent.hf.space`.
5. **Auto-rebuilds** whenever we upload new code.

Why HF was a great fit: **free, no credit card, 16GB RAM** (more than enough for
Chromium), and native Docker support.

> Note: free Spaces **sleep when idle** and wake on the next request (first hit
> after sleeping is slow). That's normal for free hosting.

---

## 7. The complete end-to-end flow (a real request's journey)

Let's trace what happens when you use the live app. Suppose you search for a job
and send outreach.

```
[ Your browser ]
       │  1. You open https://hire-loop-agent.vercel.app and type "python"
       ▼
[ Vercel: HireLoop frontend ]
       │  2. Browser calls the frontend's own BFF route: POST /api/jobs/search
       │  3. The BFF (server-side) adds the secret X-Internal-Key header
       ▼
[ Hugging Face: Job Agent container ]
       │  4. Checks the key (401 if wrong), runs the scraper (Firecrawl/RemoteOK)
       │  5. Returns a clean list of jobs as JSON
       ▼
[ Vercel BFF ]  →  6. Passes the jobs back to your browser → you see the list
       │
       │  --- you pick a job; the résumé step runs on Vercel using Groq (LLM) ---
       │
       │  7. You enter a recruiter email and click "Generate"
       ▼
[ Vercel BFF: POST /api/outreach/generate ]
       ▼
[ Hugging Face: Cold Mail container ]
       │  8. Uses Groq (LLM) to write a personalized email draft → returns it
       ▼
[ Your browser ]  →  9. You review the draft (the human-in-the-loop gate)
       │  10. You click "Approve & Send"  →  POST /api/outreach/send {approved:true}
       ▼
[ Cold Mail container ]
       │  11. Refuses if approved≠true (409). If DRY_RUN=true → mock "drafted".
       │      If real send → SMTP delivers the email + writes an audit log entry.
       ▼
[ Your browser ]  →  12. "Done" screen shows the outreach record. ✅
```

**Every arrow between Vercel and Hugging Face is an HTTPS API call secured by the
shared internal key.** Every box is a Docker container running on a cloud. Every
secret was injected at runtime, never stored in code.

---

## 8. Safety mechanisms (why this is "production-grade")

| Mechanism | What it does |
|-----------|--------------|
| **Internal API key** | Only our frontend can call the services (`401` otherwise) |
| **Approval gate** | No email sends without explicit human approval (`409` otherwise) |
| **Dry-run default** | `DRY_RUN=true` means no real email goes out unless deliberately enabled |
| **Volume cap** | Caps how many real emails per run (`429` beyond the limit) |
| **Health checks** | `/healthz` lets the system know if a service is alive |
| **Secrets isolation** | Keys live in encrypted stores, never in the repo |

---

## 9. Mini-glossary

- **Microservice** — a small, independent program that does one job and talks to
  others over HTTP.
- **Monolith** — the opposite: one big program that does everything.
- **API** — how programs ask each other to do things over the web.
- **Endpoint / Route** — a specific API address, e.g. `/search`.
- **JSON** — the text format for sending structured data.
- **Docker** — packages an app + its environment into a portable container.
- **Image** — the built package; **Container** — a running image.
- **Dockerfile** — the build recipe; **Registry** — where images are stored.
- **docker-compose** — runs multiple containers together.
- **Port** — a numbered "door" a program listens on (8000, 8001, 3000).
- **Environment variable** — runtime configuration value (keys, URLs).
- **Secret** — a sensitive env var (API key, password) kept out of code.
- **CI** — auto build + test on every change; **CD** — auto deploy.
- **BFF (Backend-for-Frontend)** — a backend layer that serves one frontend and
  hides the other services/secrets from the browser.
- **Serverless function** — code that runs on demand without you managing a server
  (Vercel's API routes).
- **Cold start** — the delay when a sleeping/free service wakes up for a request.
- **Deployment** — getting code running on a public server.

---

## 10. How it all maps to the repo

| Concept | Where to look |
|---------|---------------|
| Microservices | `services/job-agent/`, `services/cold-mail/`, `frontend/` |
| Dockerfiles | `services/*/Dockerfile` |
| Multi-container local run | `docker-compose.yml` |
| BFF routes | `frontend/src/app/api/jobs/`, `frontend/src/app/api/outreach/` |
| Shared data contracts | `packages/contracts/` |
| Secrets templates | `*.env.example` (real `.env` is gitignored) |
| HF Space config | `services/*/README.md` (frontmatter) |
| HF deploy automation | `scripts/deploy_hf.py` |
| Deployment guide | `docs/deployment-plan.md`, `RUNBOOK.md` |
| Architecture | `docs/architecture.md` |

---

**You now have the full mental model:** three microservices → each in a Docker
container → hosted on Hugging Face (Python) and Vercel (frontend) → connected by
secure APIs → deployed automatically by each platform (CI/CD) → with secrets
injected safely at runtime. 🎉
