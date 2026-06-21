---
title: HireLoop Job Agent
emoji: 🔁
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 8000
pinned: false
---

# HireLoop — Job Agent Service

FastAPI service that searches, scrapes, and normalizes job listings
(Naukri, RemoteOK, Wellfound) into a unified schema. Part of the
[HireLoop](https://github.com/Ramcharan-AIML/hire-loop-agent) platform.

Endpoints: `GET /healthz`, `POST /search`, `GET /export.csv`.
All non-health endpoints require the shared `X-Internal-Key` header.

Configure as Space secrets: `FIRECRAWL_API_KEY`, `INTERNAL_API_KEY`.
