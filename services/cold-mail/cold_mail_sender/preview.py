import sys
from typing import Literal
from models import Contact, EmailDraft

def preview_email(draft: EmailDraft, contact: Contact, index: int, total: int) -> None:
    """Pretty-prints the email preview with metadata, body, and word count."""
    print("=" * 80)
    print(f" OUTREACH TARGET PREVIEW [{index}/{total}]")
    print("=" * 80)
    
    # Metadata
    print(f"Recipient Name : {contact.recipient_name or 'N/A'}")
    print(f"Recipient Email: {contact.recipient_email}")
    print(f"Company        : {contact.company}")
    print(f"Target Role    : {contact.role}")
    if contact.job_url:
        print(f"Job URL        : {contact.job_url}")
        
    print("-" * 80)
    print(f"SUBJECT: {draft.subject}")
    print("-" * 80)
    
    # Body
    print(draft.body)
    
    print("-" * 80)
    print(f"Word Count     : {draft.word_count} words (limit: 150)")
    print("=" * 80)

def prompt_action() -> Literal["send", "draft", "skip"]:
    """Prompts the operator for the next action. Re-prompts on invalid input.
    
    Returns:
        One of "send", "draft", or "skip".
    """
    while True:
        try:
            user_input = input("Action (send/draft/skip): ").strip().lower()
            if user_input in ("send", "draft", "skip"):
                return user_input  # type: ignore
            print("Invalid input. Please choose one of: send, draft, skip.")
        except (KeyboardInterrupt, EOFError):
            print("\n[INFO] Input interrupted. Defaulting to 'skip'.")
            return "skip"
