"""
CSV Exporter — writes a list of Job objects to a CSV file.

Generates a timestamped filename based on the job title and writes
all results using the unified schema defined in Job.csv_headers().
"""

import csv
import re
import logging
from pathlib import Path
from datetime import datetime

from src.models.job import Job
from src import config

logger = logging.getLogger("job_agent.csv_exporter")


def _sanitize_filename(title: str) -> str:
    """
    Convert a job title into a safe, lowercase, underscore-separated filename slug.

    Example:
        "Data Scientist" → "data_scientist"
        "C++ Developer / ML" → "c_developer_ml"
    """
    slug = title.lower().strip()
    slug = re.sub(r"[^a-z0-9\s]", "", slug)   # remove non-alphanumeric
    slug = re.sub(r"\s+", "_", slug)            # spaces → underscores
    slug = slug.strip("_")
    return slug or "jobs"


def export_to_csv(jobs: list[Job], job_title: str) -> str:
    """
    Export a list of Job objects to a CSV file.

    Args:
        jobs: List of Job objects to write. Can be empty (writes header-only CSV).
        job_title: The searched job title, used to generate the filename.

    Returns:
        The absolute path (as a string) to the created CSV file.
    """
    # Ensure output directory exists
    output_dir = config.OUTPUT_DIR
    output_dir.mkdir(parents=True, exist_ok=True)

    # Build filename: jobs_<title_slug>_<timestamp>.csv
    title_slug = _sanitize_filename(job_title)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"jobs_{title_slug}_{timestamp}.csv"
    filepath = output_dir / filename

    # Also build a stable "latest" filename that doesn't change timestamps
    latest_filename = f"jobs_{title_slug}_latest.csv"
    latest_filepath = output_dir / latest_filename

    # Write CSV
    headers = Job.csv_headers()

    for path in [filepath, latest_filepath]:
        with open(path, mode="w", newline="", encoding="utf-8") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=headers)
            writer.writeheader()

            for job in jobs:
                writer.writerow(job.to_dict())

    job_count = len(jobs)
    if job_count > 0:
        logger.info(f"Exported {job_count} jobs to {filepath} and {latest_filepath}")
    else:
        logger.warning(f"No jobs to export — created header-only CSV at {filepath}")

    return str(filepath)
