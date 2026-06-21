import os
import csv
import sys
from models import Contact

def load_opt_outs(path: str = "do_not_contact.csv") -> set[str]:
    """Loads opt-out email addresses from do_not_contact.csv.
    
    Returns a set of lowercase email addresses.
    """
    opt_outs = set()
    if not os.path.exists(path):
        return opt_outs
        
    try:
        with open(path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            # Skip header if present or parse simple email list
            for row in reader:
                if not row:
                    continue
                # Take first column as email address
                email = row[0].strip().lower()
                if email and "@" in email:
                    opt_outs.add(email)
    except Exception as e:
        print(f"WARNING: Failed to load opt-out list '{path}': {e}", file=sys.stderr)
        
    return opt_outs

def filter_targets(contacts: list[Contact], opt_outs: set[str]) -> list[Contact]:
    """Filters out contacts who have opted out of communication."""
    if not opt_outs:
        return contacts
        
    filtered = []
    for contact in contacts:
        if contact.recipient_email.strip().lower() in opt_outs:
            print(f"[SAFETY FILTER] Bypassed {contact.recipient_email} - present in opt-out list (do_not_contact.csv).")
        else:
            filtered.append(contact)
    return filtered
