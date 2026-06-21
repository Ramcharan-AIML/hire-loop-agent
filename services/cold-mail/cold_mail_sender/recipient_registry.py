import os
import csv
import sys
from models import Contact

def load_sent_recipients(log_path: str = "outreach_log.csv") -> set[str]:
    """Loads recipient emails that have already been sent or drafted from outreach_log.csv.
    
    This prevents sending multiple cold emails to the same recipient in subsequent runs.
    """
    sent_recipients = set()
    if not os.path.exists(log_path):
        return sent_recipients
        
    try:
        with open(log_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            # Find column index for recipient_email and status in header
            try:
                header = next(reader)
                email_idx = header.index("recipient_email")
                status_idx = header.index("status")
            except (ValueError, StopIteration):
                # Fallback to defaults if header is missing or malformed
                email_idx = 1
                status_idx = 5
                
            for row in reader:
                if len(row) > max(email_idx, status_idx):
                    email = row[email_idx].strip().lower()
                    status = row[status_idx].strip().lower()
                    # Treat 'sent' and 'drafted' as successful outreach events that block deduplication
                    if status in ("sent", "drafted"):
                        sent_recipients.add(email)
    except Exception as e:
        print(f"WARNING: Failed to parse recipient registry from log file: {e}", file=sys.stderr)
        
    return sent_recipients

def filter_duplicates(contacts: list[Contact], sent_set: set[str]) -> list[Contact]:
    """Filters out contacts who have already received outreach."""
    if not sent_set:
        return contacts
        
    filtered = []
    for contact in contacts:
        email = contact.recipient_email.strip().lower()
        if email in sent_set:
            print(f"[DEDUPLICATION] Bypassed {contact.recipient_email} - outreach was already generated/sent previously.")
        else:
            filtered.append(contact)
    return filtered
