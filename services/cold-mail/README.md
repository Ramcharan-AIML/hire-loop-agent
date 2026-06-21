---
title: HireLoop Cold Mail
emoji: ✉️
colorFrom: blue
colorTo: green
sdk: docker
app_port: 8001
pinned: false
---

# HireLoop — Cold Mail Service

FastAPI service that generates personalized recruiter outreach emails (Groq)
and delivers them over SMTP, behind a human-approval gate with dry-run default.
Part of the [HireLoop](https://github.com/Ramcharan-AIML/hire-loop-agent) platform.

Endpoints: `GET /healthz`, `POST /generate`, `POST /send`, `GET /log`.
All non-health endpoints require the shared `X-Internal-Key` header.

Configure as Space secrets: `GROQ_API_KEY`, `SMTP_USER`, `SMTP_PASSWORD`,
`SENDER_NAME`, `INTERNAL_API_KEY` (keep `DRY_RUN=true` until ready to send).
