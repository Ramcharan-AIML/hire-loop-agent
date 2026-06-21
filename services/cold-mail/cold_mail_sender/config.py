import os
import sys
from dataclasses import dataclass
from dotenv import load_dotenv

@dataclass
class AppConfig:
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: str
    sender_name: str
    dry_run: bool
    send_mode: str
    max_outreach_per_run: int
    input_path: str
    groq_api_key: str | None
    llm_provider: str
    llm_model: str

def load_config() -> AppConfig:
    """Loads and validates configuration from environment variables, .env file, or Streamlit secrets."""
    load_dotenv()
    
    def get_val(key: str, default: str = "") -> str:
        # 1. Try streamlit secrets if running inside Streamlit
        if "streamlit" in sys.modules:
            try:
                import streamlit as st
                # Try exact case
                if key in st.secrets:
                    val = st.secrets[key]
                    if val is not None:
                        return str(val)
                # Try lowercase
                lower_key = key.lower()
                if lower_key in st.secrets:
                    val = st.secrets[lower_key]
                    if val is not None:
                        return str(val)
            except Exception:
                pass
        # 2. Fallback to OS environment
        val = os.getenv(key)
        if val is not None:
            return val
        return default

    # 1. SMTP settings
    smtp_host = get_val("SMTP_HOST", "smtp.gmail.com")
    
    try:
        smtp_port = int(get_val("SMTP_PORT", "587"))
    except (ValueError, TypeError):
        smtp_port = 587
        
    smtp_user = get_val("SMTP_USER", "")
    smtp_password = get_val("SMTP_PASSWORD", "")
    sender_name = get_val("SENDER_NAME", "")
    
    # 2. Safety settings (DRY_RUN default is True)
    dry_run_str = get_val("DRY_RUN", "true").lower().strip()
    if dry_run_str in ("false", "0", "no", "off"):
        dry_run = False
    else:
        dry_run = True
        
    send_mode = get_val("SEND_MODE", "draft").lower().strip()
    if send_mode not in ("draft", "send"):
        send_mode = "draft"
        
    try:
        max_outreach_per_run = int(get_val("MAX_OUTREACH_PER_RUN", "5"))
    except (ValueError, TypeError):
        max_outreach_per_run = 5
        
    # 3. Input and LLM settings
    input_path = get_val("INPUT_PATH", "contacts.json")
    
    groq_api_key = get_val("GROQ_API_KEY", "").strip()
    if not groq_api_key:
        groq_api_key = None
        
    llm_provider = get_val("LLM_PROVIDER", "groq")
    llm_model = get_val("LLM_MODEL", "llama-3.1-8b-instant")
    
    return AppConfig(
        smtp_host=smtp_host,
        smtp_port=smtp_port,
        smtp_user=smtp_user,
        smtp_password=smtp_password,
        sender_name=sender_name,
        dry_run=dry_run,
        send_mode=send_mode,
        max_outreach_per_run=max_outreach_per_run,
        input_path=input_path,
        groq_api_key=groq_api_key,
        llm_provider=llm_provider,
        llm_model=llm_model
    )

