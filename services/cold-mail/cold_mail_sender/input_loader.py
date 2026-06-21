import json
import os
import csv
import sys
from models import Contact

def load_targets(path: str | None = None) -> list[Contact]:
    """Loads and validates outreach targets from a JSON or CSV file.
    
    Skips invalid records with a warning without aborting the entire process.
    Supports .json and .csv extensions automatically.
    
    Args:
        path: Path to the input file containing contacts. Defaults to "contacts.json".
        
    Returns:
        A list of validated Contact objects.
        
    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If the file has a malformed format.
    """
    if path is None:
        path = "contacts.json"
        
    if not os.path.exists(path):
        raise FileNotFoundError(f"Contacts input file not found at: '{path}'")
        
    ext = os.path.splitext(path)[1].lower()
    
    # 1. Parse JSON or CSV into raw dictionary lists
    raw_records = []
    
    if ext == ".json":
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    print(f"[INFO] JSON input file '{path}' is empty.")
                    return []
                data = json.loads(content)
                if not isinstance(data, list):
                    raise ValueError("JSON root structure must be a list of objects.")
                raw_records = data
        except json.JSONDecodeError as e:
            raise ValueError(f"Malformed JSON in input file '{path}': {e}")
            
    elif ext == ".csv":
        try:
            with open(path, "r", newline="", encoding="utf-8") as f:
                reader = csv.reader(f)
                try:
                    headers = next(reader)
                except StopIteration:
                    print(f"[INFO] CSV input file '{path}' is empty.")
                    return []
                    
                # Clean and normalize header columns
                headers = [h.strip().lower() for h in headers]
                
                for idx, row in enumerate(reader):
                    if not row or all(not cell.strip() for cell in row):
                        continue
                    # Create row dictionary mapped from headers
                    row_dict = {}
                    for col_idx, header in enumerate(headers):
                        if col_idx < len(row):
                            row_dict[header] = row[col_idx]
                    raw_records.append(row_dict)
        except Exception as e:
            raise ValueError(f"Failed to read CSV input file '{path}': {e}")
            
    else:
        raise ValueError(f"Unsupported file extension '{ext}'. Only .json and .csv are supported.")
        
    # 2. Validate parsed raw records
    valid_contacts = []
    
    for idx, item in enumerate(raw_records):
        if not isinstance(item, dict):
            print(f"WARNING: Record at index {idx} is not a valid map/dictionary. Skipping.", file=sys.stderr)
            continue
            
        missing_fields = []
        
        # Helper to get stripped string or None
        def get_clean_str(field_name: str, required: bool = False) -> str | None:
            val = item.get(field_name)
            if val is None:
                if required:
                    missing_fields.append(field_name)
                return None
            if not isinstance(val, str):
                val = str(val)
            cleaned = val.strip()
            if not cleaned:
                if required:
                    missing_fields.append(field_name)
                return None
            return cleaned

        # Validate required fields
        recipient_email = get_clean_str("recipient_email", required=True)
        company = get_clean_str("company", required=True)
        role = get_clean_str("role", required=True)
        candidate_name = get_clean_str("candidate_name", required=True)
        candidate_background = get_clean_str("candidate_background", required=True)
        
        # Email format verification: contains '@' and '.'
        if recipient_email and ("@" not in recipient_email or "." not in recipient_email):
            missing_fields.append("recipient_email (invalid email format: must contain '@' and '.')")
            
        if missing_fields:
            fields_str = ", ".join(missing_fields)
            print(f"WARNING: Skipping contact record at index {idx} due to missing or invalid required fields: {fields_str}", file=sys.stderr)
            continue
            
        # Optional fields
        recipient_name = get_clean_str("recipient_name")
        job_url = get_clean_str("job_url")
        portfolio_url = get_clean_str("portfolio_url")
        personalization_note = get_clean_str("personalization_note")
        linkedin_url = get_clean_str("linkedin_url")
        resume_link = get_clean_str("resume_link")
        
        contact = Contact(
            recipient_email=recipient_email,  # type: ignore (already checked not None)
            company=company,                  # type: ignore (already checked not None)
            role=role,                        # type: ignore (already checked not None)
            candidate_name=candidate_name,    # type: ignore (already checked not None)
            candidate_background=candidate_background,  # type: ignore (already checked not None)
            recipient_name=recipient_name,
            job_url=job_url,
            portfolio_url=portfolio_url,
            personalization_note=personalization_note,
            linkedin_url=linkedin_url,
            resume_link=resume_link
        )
        valid_contacts.append(contact)
        
    return valid_contacts
