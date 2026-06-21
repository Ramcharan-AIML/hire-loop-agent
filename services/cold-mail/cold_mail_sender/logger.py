import csv
import datetime
import os
import sys
from models import Contact, EmailDraft

def append_log(
    contact: Contact,
    draft: EmailDraft,
    status: str,
    error_message: str = "",
    path: str = "outreach_log.csv"
) -> None:
    """Appends an outreach record to an audit CSV file.
    
    If the file does not exist, it writes the headers first.
    If the file is locked (e.g. open in Excel), it falls back to writing a backup text log.
    Never raises exceptions that could crash the main execution loop.
    """
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
    
    headers = ["timestamp", "recipient_email", "company", "role", "subject", "status", "error_message"]
    
    row = [
        timestamp,
        contact.recipient_email,
        contact.company,
        contact.role,
        draft.subject,
        status,
        error_message
    ]
    
    try:
        # Check if we need to write headers
        write_header = not os.path.exists(path) or os.path.getsize(path) == 0
        
        with open(path, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f, quoting=csv.QUOTE_ALL)
            if write_header:
                writer.writerow(headers)
            writer.writerow(row)
            
    except PermissionError as e:
        # Fallback to text file log when PermissionError (e.g. file lock on Windows) occurs
        backup_path = "outreach_log_backup.txt"
        print(
            f"WARNING: Log file '{path}' is locked or inaccessible ({e}). "
            f"Falling back to backup audit log: '{backup_path}'",
            file=sys.stderr
        )
        try:
            with open(backup_path, "a", encoding="utf-8") as bf:
                bf.write(f"=== OUTREACH AUDIT FALLBACK ({timestamp}) ===\n")
                bf.write(f"Recipient: {contact.recipient_email}\n")
                bf.write(f"Company  : {contact.company}\n")
                bf.write(f"Role     : {contact.role}\n")
                bf.write(f"Subject  : {draft.subject}\n")
                bf.write(f"Status   : {status}\n")
                if error_message:
                    bf.write(f"Error    : {error_message}\n")
                bf.write("-" * 40 + "\n")
        except Exception as be:
            print(f"CRITICAL WARNING: Failed to write to backup audit log: {be}", file=sys.stderr)
            
    except Exception as e:
        print(f"WARNING: Failed to log outreach event to CSV: {e}", file=sys.stderr)
