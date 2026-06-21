# Job Agent Service — needs real Chromium for Playwright (architecture.md §3.1, §8).
# Vercel serverless cannot run this; deploy to a container host (Render/Railway/Fly).
#
# Use the official Playwright image: it ships Chromium + all system deps
# preinstalled, avoiding the fragile `apt ... --with-deps` step. The tag is
# pinned to match the playwright Python package version in requirements.txt.
FROM mcr.microsoft.com/playwright/python:v1.60.0-jammy

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && playwright install chromium

# Copy the FastAPI wrapper and the vendored scraper package.
COPY app ./app
COPY job_agent_real ./job_agent_real

ENV PLAYWRIGHT_HEADLESS=true
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
