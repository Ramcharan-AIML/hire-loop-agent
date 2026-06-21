"""
Configuration module for the Job Agent.

Loads settings from .env file and exposes constants used across scrapers,
exporters, and the orchestrator.
"""

import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# ──────────────────────────────────────────────
# Load environment variables from .env file
# ──────────────────────────────────────────────
load_dotenv()

# ──────────────────────────────────────────────
# Project paths
# ──────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = PROJECT_ROOT / "output"

# ──────────────────────────────────────────────
# API Keys
# ──────────────────────────────────────────────
FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY", "")

# ──────────────────────────────────────────────
# Scraping settings
# ──────────────────────────────────────────────
REQUEST_DELAY = int(os.getenv("REQUEST_DELAY", "2"))
NAUKRI_PAGES = int(os.getenv("NAUKRI_PAGES", "3"))

# Default User-Agent header — mimics a real browser to reduce bot-detection
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)

# Default headers used by HTTP-based scrapers
DEFAULT_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# ──────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()


def setup_logging() -> logging.Logger:
    """
    Configure and return the root logger for the Job Agent.

    Call this once at application startup (in main.py).
    All modules can then use logging.getLogger(__name__) to get child loggers.
    """
    logger = logging.getLogger("job_agent")

    # Avoid adding duplicate handlers if called multiple times
    if not logger.handlers:
        logger.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))

        handler = logging.StreamHandler()
        handler.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))

        formatter = logging.Formatter(
            fmt="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger
