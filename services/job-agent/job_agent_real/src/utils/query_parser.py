"""
Query parser utility to extract job keywords and locations from natural search phrases.
"""

import re

def parse_search_query(query: str) -> tuple[str, str | None]:
    """
    Parse a search query to extract the job keyword and location.
    
    Examples:
      - "find product manager roles in Bengaluru" -> ("product manager", "Bengaluru")
      - "python developer jobs in mumbai" -> ("python developer", "mumbai")
      - "software engineer in Pune" -> ("software engineer", "Pune")
      - "machine learning" -> ("machine learning", None)
    """
    # Clean up multiple whitespaces
    query = " ".join(query.split()).strip()
    
    # Remove common search prefix command phrases (case-insensitive)
    prefixes = [
        r"^find\s+",
        r"^search\s+",
        r"^get\s+",
        r"^look\s+for\s+",
    ]
    for pattern in prefixes:
        query = re.sub(pattern, "", query, flags=re.IGNORECASE)
        
    # Standard location pattern: "[keyword] in [location]" or "[keyword] at [location]"
    # e.g., "product manager roles in Bengaluru"
    match = re.search(r"^(.*?)\s+(?:in|at)\s+([A-Za-z\s]+)$", query, re.IGNORECASE)
    if match:
        keyword = match.group(1).strip()
        location = match.group(2).strip()
    else:
        keyword = query
        location = None
        
    # Clean up keyword: remove words like "roles", "jobs", "openings", "positions", "opportunities"
    suffix_pattern = r"\s+(?:roles|jobs|openings|positions|opportunities)$"
    keyword = re.sub(suffix_pattern, "", keyword, flags=re.IGNORECASE).strip()
    
    return keyword, location
