# Edge Cases: The Closer — Cold Email Writer + Send Bot

This document lists critical system edge cases across the entire cold email pipeline, specifying expected behaviors and mitigation strategies for each module.

---

## 1. Input Loader Edge Cases (`input_loader.py` / `contacts.json`)

| Scenario / Edge Case | Expected System Behavior | Mitigation Strategy |
| :--- | :--- | :--- |
| **Missing Optional Fields**<br>e.g., `recipient_name` is null or empty. | Do not fail. Use dynamic default fallback values (e.g., `"there"` or `"Team"`). | Templates should use `contact.recipient_name or "there"` in string interpolation. |
| **Missing Required Fields**<br>e.g., `recipient_email` is missing. | Raise a localized parsing error for the current record. Log the failure, warn the operator, and skip to the next contact. **Do not crash the CLI process.** | Wrap target load parsing in a `try-except` block, flagging validation errors explicitly. |
| **Invalid Email Format**<br>e.g., `"notanemail"` or empty. | Flag as an invalid target, print a clear terminal warning, log the skip reason, and skip to the next record. | Apply regex validation `[^@]+@[^@]+\.[^@]+` before starting generation. |
| **Extremely Long Inputs**<br>e.g., candidate background exceeds 1000 words. | Validate length; prevent generator overflow which could exceed word limits. | Warn user or truncate/summarize background field gracefully if it exceeds a character limit (e.g., 800 chars). |
| **Empty JSON Input File** | Report that no contacts were loaded, print a summary, and exit gracefully with status code `0`. | Verify target list length immediately after parsing; print `"No outreach targets found in contacts.json"` if empty. |

---

## 2. Email Generation Edge Cases (`email_generator.py`)

| Scenario / Edge Case | Expected System Behavior | Mitigation Strategy |
| :--- | :--- | :--- |
| **Word Count Limit Overflow**<br>e.g., generated email exceeds 150 words. | Flag as a warning in the interactive CLI preview. | Programmatically calculate `len(body.split())` in `EmailDraft` and raise a warning indicator in the preview if $> 150$. |
| **Empty Personalization Note**<br>e.g., `personalization_note` is empty. | Use a generic but highly tailored role+company fallback statement instead of leaving a blank space. | Fallback: `"I noticed you're seeking talent for the {role} position and wanted to reach out regarding the fit."` |
| **Special Characters in Inputs**<br>e.g., `role` contains symbols like `C++`, `Backend/Fullstack`. | Correctly interpolate string without breaking templates. | Use raw strings or HTML/text escaping depending on delivery format (SMTP sends plain text by default, which is safe). |
| **Exaggerated/Hallucinated Claims** | Templates must never invent relationship ties or work experiences. | Keep templates deterministic and static; do not auto-inject external claims. |

---

## 3. Interactive CLI Edge Cases (`main.py` / `preview.py`)

| Scenario / Edge Case | Expected System Behavior | Mitigation Strategy |
| :--- | :--- | :--- |
| **Invalid User Keyboard Input**<br>e.g., user inputs `"yes"` or enters blank space when prompted `[send/draft/skip]`. | Re-prompt the user until a valid command option is submitted. | Use an infinite input loop containing a lowercased match case: `while prompt not in ('send', 'draft', 'skip'):`. |
| **User Interrupt (Ctrl+C / Ctrl+D)** | Exit the CLI loop gracefully. Ensure any emails already sent are preserved in the log file before terminating. | Capture `KeyboardInterrupt` and `EOFError` in the orchestrator, printing a graceful farewell message and flush-writing any pending logs. |
| **Batch Max Outreach Limit**<br>e.g., `contacts.json` has 50 entries but `MAX_OUTREACH_PER_RUN` is 5. | Slice target list to process exactly 5 records, notifying the user. | Apply slicing `targets = loaded_targets[:config.max_outreach]` during bootstrap. |

---

## 4. Network & Sending Edge Cases (`email_sender.py`)

| Scenario / Edge Case | Expected System Behavior | Mitigation Strategy |
| :--- | :--- | :--- |
| **SMTP Authentication Failure**<br>e.g., wrong password, missing App Password. | Catch connection/auth errors, show a helpful message (suggesting Gmail App Passwords setup), mark the attempt as `failed` in log, and halt the batch. | Wrap network calls in `try ... except smtplib.SMTPAuthenticationError` with actionable instruction guides. |
| **Connection Drop Mid-Send** | Log target send as `failed` with the socket error trace. Exit or let user retry. | Apply retry policy with exponent backoff or pause the CLI, offering a retry option. |
| **Dry Run Mode Activated**<br>e.g., `DRY_RUN=true` | Process target loader, generation, and CLI preview prompts normally, but do not establish a socket connection. Log target status as `generated`. | Conditionally call connection logic; inject a mock/dry-run provider when configuration dictates. |
| **Recipient Unreachable**<br>e.g., invalid/bounced inbox. | The initial SMTP server hand-shake might pass, but if the recipient address bounces, SMTP errors are captured. | Log initial SMTP delivery response status; real bounces must be verified manually in the operator's inbox. |

---

## 5. Logger Edge Cases (`logger.py`)

| Scenario / Edge Case | Expected System Behavior | Mitigation Strategy |
| :--- | :--- | :--- |
| **Log File Locked**<br>e.g., `outreach_log.csv` is open in Microsoft Excel on Windows. | Excel locks the file for exclusive writing, causing Python to throw `PermissionError`. The app must not crash! | Wrap CSV appends in a retry block, or catch `PermissionError` and dump the record to a backup `.txt` or temporary log, reporting a warning to the console. |
| **CSV Injection in Email Content**<br>e.g., email body contains commas or quotes. | Ensure special characters do not corrupt the CSV boundaries. | Use the standard Python `csv.writer` module which automatically handles proper quotes, newlines, and escaping of strings. |
| **Missing Log File** | Create the CSV file on the fly and populate it with the appropriate header columns. | Use `os.path.exists` checks to dynamically write `['timestamp', 'recipient_email', 'company', 'role', 'subject', 'status', 'error_message']` headers if the file is new. |
