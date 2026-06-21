"""
Job Agent Service — FastAPI wrapper around the vendored `job-agent-real` CLI.

This closes the deployment gap (architecture.md §3.1): the scraper is exposed as
a live HTTP service instead of a local-only CLI. It reuses the vendored
`src.orchestrator.collect_jobs` without rewriting any scraping logic.

Run locally:  uvicorn app.main:app --reload --port 8000   (from services/job-agent)
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse

# --- Make the vendored package importable (it uses absolute `from src...`) ---
JOB_AGENT_ROOT = Path(__file__).resolve().parent.parent / "job_agent_real"
if str(JOB_AGENT_ROOT) not in sys.path:
    sys.path.insert(0, str(JOB_AGENT_ROOT))

from src.orchestrator import collect_jobs  # noqa: E402
from src.models.job import Job  # noqa: E402
from src.config import setup_logging  # noqa: E402

from .schemas import SearchRequest, SearchResponse, JobRecord  # noqa: E402

# Surface the vendored scrapers' logs (Firecrawl/Playwright/etc.) in the service
# output for observability (architecture.md §10). The CLI did this; the API must too.
setup_logging()

app = FastAPI(title="Job Agent Service", version="0.1.0")

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")
VALID_SOURCES = {"naukri", "remoteok", "wellfound"}


def _auth(provided: str) -> None:
    """Reject calls without the shared internal key (architecture.md §10).

    If INTERNAL_API_KEY is unset (local dev), auth is skipped.
    """
    if INTERNAL_API_KEY and provided != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="invalid or missing X-Internal-Key")


def _normalize_sources(sources):
    if not sources:
        return None
    return [s.strip().lower() for s in sources if s.strip().lower() in VALID_SOURCES]


def _build_query(req: SearchRequest) -> str:
    return f"{req.role} in {req.location}" if req.location else req.role


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.post("/search", response_model=SearchResponse)
def search(req: SearchRequest, x_internal_key: str = Header(default="")):
    _auth(x_internal_key)
    # Server runs headless by default; honor the flag the orchestrator reads via env.
    os.environ["PLAYWRIGHT_HEADLESS"] = "true" if req.headless else "false"

    query = _build_query(req)
    sources = _normalize_sources(req.sources)

    try:
        jobs: list[Job] = collect_jobs(query, sources=sources)
    except Exception as e:  # surface scraper failures as a 502, not a crash
        raise HTTPException(status_code=502, detail=f"scrape failed: {e}")

    if req.limit:
        jobs = jobs[: req.limit]

    records = [JobRecord(**job.to_dict()) for job in jobs]
    return SearchResponse(count=len(records), jobs=records)


@app.get("/export.csv")
def export_csv(role: str, location: str | None = None,
               x_internal_key: str = Header(default="")):
    """Legacy CSV parity (architecture.md §6.1). Streams the same records as CSV."""
    _auth(x_internal_key)
    import csv
    import io

    query = f"{role} in {location}" if location else role
    try:
        jobs = collect_jobs(query)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"scrape failed: {e}")

    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=Job.csv_headers())
    writer.writeheader()
    for job in jobs:
        writer.writerow(job.to_dict())
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=jobs.csv"},
    )
