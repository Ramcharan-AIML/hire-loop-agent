import sys
from config import load_config
from input_loader import load_targets
from email_generator import generate_email
from preview import preview_email, prompt_action
from email_sender import DryRunEmailSender, SmtpEmailSender
from logger import append_log
from opt_out_filter import load_opt_outs, filter_targets
from recipient_registry import load_sent_recipients, filter_duplicates

def main() -> None:
    # 1. Load Configuration
    try:
        config = load_config()
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to load configuration: {e}", file=sys.stderr)
        sys.exit(1)
        
    # 2. Print Safety Envelope Status
    print("=" * 50)
    print(" THE CLOSER — COLD EMAIL OUTREACH PIPELINE")
    print("=" * 50)
    print(f"Safety Default (DRY_RUN) : {config.dry_run}")
    print(f"Configured SEND_MODE     : {config.send_mode}")
    print(f"Volume Cap (Max Per Run) : {config.max_outreach_per_run}")
    print(f"LLM Provider / Model     : {config.llm_provider} ({config.llm_model})")
    print(f"Sender Display Identity  : {config.sender_name}")
    print(f"SMTP Server Host         : {config.smtp_host}:{config.smtp_port}")
    print("=" * 50)
    
    # 3. Load Targets (Supports JSON or CSV)
    try:
        targets = load_targets(config.input_path)
    except FileNotFoundError as e:
        print(f"FATAL ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    except ValueError as e:
        print(f"FATAL ERROR: Malformed inputs in '{config.input_path}': {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"FATAL ERROR: Unexpected error loading inputs: {e}", file=sys.stderr)
        sys.exit(1)
        
    if not targets:
        print("\n[INFO] No valid targets found to process. Exiting gracefully.")
        sys.exit(0)
        
    # 4. Apply Safety Filters: Opt-Out and Deduplication
    print("\nApplying safety guardrail filters...")
    
    # a. Opt-Out Filter
    opt_outs = load_opt_outs("do_not_contact.csv")
    targets = filter_targets(targets, opt_outs)
    
    # b. Deduplication Registry Filter
    sent_set = load_sent_recipients("outreach_log.csv")
    targets = filter_duplicates(targets, sent_set)
    
    if not targets:
        print("\n[INFO] All targets were filtered by safety filters (Opt-out/Deduplication). Exiting.")
        sys.exit(0)
        
    # 5. Enforce Volume Cap (Safety Guardrail)
    original_count = len(targets)
    if original_count > config.max_outreach_per_run:
        print(
            f"\n[SAFETY FILTER] Loaded {original_count} unsent targets. "
            f"Slicing list to MAX_OUTREACH_PER_RUN limit of {config.max_outreach_per_run}."
        )
        targets = targets[:config.max_outreach_per_run]
        
    total_to_evaluate = len(targets)
    
    # 6. Initialize Counters for Final Report
    metrics = {
        "sent": 0,
        "drafted": 0,
        "skipped": 0,
        "failed": 0
    }
    
    # 7. Select Delivery Adapter
    sender = DryRunEmailSender() if config.dry_run else SmtpEmailSender()
    if config.dry_run:
        print("\n[MOCK MODE] DRY_RUN is active. No real network calls will be made.")
    else:
        print(f"\n[LIVE MODE] Real SMTP delivery adapter activated (Targeting: '{config.smtp_user}').")
        
    print("\nStarting batch email processing... (Press Ctrl+C at any time to abort cleanly)\n")
    
    # 8. Run Loop with Thread-Safe Loop-Level Interrupt Trapping
    try:
        for idx, contact in enumerate(targets):
            contact_num = idx + 1
            print(f"\nGenerating email for contact {contact_num}/{total_to_evaluate}: {contact.recipient_email}...")
            
            # Generate email (with Groq LLM refinement if API key exists)
            draft = generate_email(contact, config)
            
            # Display full preview
            preview_email(draft, contact, contact_num, total_to_evaluate)
            
            # Prompt operator for decision
            action = prompt_action()
            
            if action == "skip":
                print(f"[SKIPPED] Outreach for {contact.recipient_email} bypassed.")
                append_log(contact, draft, status="skipped")
                metrics["skipped"] += 1
                continue
                
            # Perform Delivery ("draft" or "send")
            print(f"Processing delivery in '{action}' mode...")
            result = sender.deliver(draft, contact, config, mode=action)
            
            if result.status == "failed":
                print(f"[-] ERROR: Delivery failed for {contact.recipient_email}: {result.error}", file=sys.stderr)
                append_log(contact, draft, status="failed", error_message=result.error or "")
                metrics["failed"] += 1
            elif result.status == "drafted":
                print(f"[+] DRAFT CREATED: Review draft in '{config.smtp_user}' inbox.")
                append_log(contact, draft, status="drafted")
                metrics["drafted"] += 1
            elif result.status == "sent":
                print(f"[+] SENT: Successfully delivered to {contact.recipient_email}.")
                append_log(contact, draft, status="sent")
                metrics["sent"] += 1
                
    except KeyboardInterrupt:
        print("\n\n[WARNING] Keyboard Interrupt detected! Terminating pipeline early and preserving logs...")
        
    # 9. Final Execution Summary (Arch §5.1)
    print("\n" + "=" * 50)
    print(" BATCH EXECUTION SUMMARY")
    print("=" * 50)
    print(f"Total Targets Evaluated: {metrics['sent'] + metrics['drafted'] + metrics['skipped'] + metrics['failed']}")
    print(f"  - Emails Sent        : {metrics['sent']}")
    print(f"  - Drafts Created     : {metrics['drafted']}")
    print(f"  - Skipped Outreach   : {metrics['skipped']}")
    print(f"  - Failed Operations  : {metrics['failed']}")
    print("=" * 50)
    print("Thank you for using The Closer! Safe sending! [OK]\n")

if __name__ == "__main__":
    main()
