"""
CLI entry point for the Job Agent.
"""
import os
import argparse
import sys
from src.config import setup_logging
from src import orchestrator

def main():
    parser = argparse.ArgumentParser(description="Job Agent CLI - aggregate jobs from multiple portals.")
    
    # Structured role and location inputs
    parser.add_argument("--role", "-r", type=str, required=True, help="Job role/title (e.g., 'Python Developer' or 'Data Engineer')")
    parser.add_argument("--location", "-l", type=str, default=None, help="Target location (e.g., 'Hyderabad', 'Bengaluru', 'Remote')")
    
    # Sources list
    parser.add_argument("--sources", type=str, default="naukri,remoteok,wellfound", help="Comma-separated scrapers to run (e.g. 'naukri,remoteok,wellfound')")
    
    # Headless flag
    parser.add_argument("--headless", action="store_true", help="Run Playwright browser in headless mode (default: headful)")
    
    # Local HTML file fallback
    parser.add_argument("--naukri-html", type=str, default=None, help="Path to pre-downloaded local Naukri HTML file to parse offline")
    
    args = parser.parse_args()
    
    # Setup logging
    logger = setup_logging()
    logger.info("Starting Job Agent...")
    
    # Handle headless environment variable override
    if args.headless:
        os.environ["PLAYWRIGHT_HEADLESS"] = "true"
        logger.info("Configured Playwright to run in headless mode.")
    else:
        os.environ["PLAYWRIGHT_HEADLESS"] = "false"
        logger.info("Configured Playwright to run in headful mode (visible window).")
        
    # Handle local HTML file environment variable override
    if args.naukri_html:
        os.environ["NAUKRI_LOCAL_HTML"] = args.naukri_html
        logger.info(f"Configured offline parser local HTML path: {args.naukri_html}")
        
    # Parse sources
    sources = [s.strip().lower() for s in args.sources.split(",") if s.strip()]
    
    # Construct combined query from structured parameters
    if args.location:
        query = f"{args.role} in {args.location}"
    else:
        query = args.role

    # Run orchestrator
    try:
        csv_path = orchestrator.run(query, sources=sources)
        print(f"\n[SUCCESS] Scrape complete! Aggregated CSV saved to: {csv_path}")
    except Exception as e:
        logger.error(f"Fatal error during execution: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
