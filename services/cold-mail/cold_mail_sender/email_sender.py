import smtplib
from dataclasses import dataclass
from typing import Literal
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from models import Contact, EmailDraft
from config import AppConfig

@dataclass
class DeliveryResult:
    status: Literal["drafted", "sent", "failed"]
    provider_message_id: str | None
    error: str | None

class EmailSender:
    def deliver(
        self,
        draft: EmailDraft,
        contact: Contact,
        config: AppConfig,
        mode: Literal["send", "draft", "skip"]
    ) -> DeliveryResult:
        """Abstract delivery method to be implemented by adapters."""
        raise NotImplementedError

class DryRunEmailSender(EmailSender):
    def deliver(
        self,
        draft: EmailDraft,
        contact: Contact,
        config: AppConfig,
        mode: Literal["send", "draft", "skip"]
    ) -> DeliveryResult:
        """Safe offline dry-run sender. Makes no network requests."""
        status = "drafted" if mode == "draft" else "sent"
        return DeliveryResult(
            status=status,
            provider_message_id="DRY-RUN-MOCK-ID",
            error=None
        )

class SmtpEmailSender(EmailSender):
    def deliver(
        self,
        draft: EmailDraft,
        contact: Contact,
        config: AppConfig,
        mode: Literal["send", "draft", "skip"]
    ) -> DeliveryResult:
        """Real SMTP sender using smtplib, STARTTLS, and identity binding."""
        if not config.smtp_user or not config.smtp_password:
            return DeliveryResult(
                status="failed",
                provider_message_id=None,
                error="Missing SMTP credentials: SMTP_USER and SMTP_PASSWORD must be configured."
            )
            
        try:
            # 1. Identity Binding
            sender_name = config.sender_name if config.sender_name else config.smtp_user
            from_header = f"{sender_name} <{config.smtp_user}>"
            
            # 2. Draft vs Send mode recipients
            if mode == "draft":
                to_email = config.smtp_user
                subject = f"[DRAFT REVIEW] {draft.subject}"
            else:
                to_email = contact.recipient_email
                subject = draft.subject
                
            # 3. Construct MIMEMultipart message
            msg = MIMEMultipart()
            msg["From"] = from_header
            msg["To"] = to_email
            msg["Subject"] = subject
            
            msg.attach(MIMEText(draft.body, "plain", "utf-8"))
            
            # 4. Connect to SMTP server
            server = smtplib.SMTP(config.smtp_host, config.smtp_port)
            server.set_debuglevel(0)
            
            # 5. STARTTLS Upgrade
            server.ehlo()
            server.starttls()
            server.ehlo()
            
            # 6. Login and Deliver
            server.login(config.smtp_user, config.smtp_password)
            server.sendmail(config.smtp_user, [to_email], msg.as_string())
            server.quit()
            
            status: Literal["drafted", "sent"] = "drafted" if mode == "draft" else "sent"
            return DeliveryResult(
                status=status,
                provider_message_id=f"SMTP-{to_email}-{hash(draft.body)}",
                error=None
            )
            
        except smtplib.SMTPAuthenticationError as e:
            return DeliveryResult(
                status="failed",
                provider_message_id=None,
                error=(
                    f"SMTP Authentication Failure: {e}. "
                    "Hint: If using Gmail, make sure you are using a 16-character App Password, "
                    "not your primary Google password, and that 2-Factor Authentication is enabled."
                )
            )
        except Exception as e:
            return DeliveryResult(
                status="failed",
                provider_message_id=None,
                error=f"SMTP Error: {str(e)}"
            )
