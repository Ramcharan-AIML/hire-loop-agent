import os
import sys
import datetime
import pandas as pd
import streamlit as st

# Add parent directory to sys.path to enable loading workspace modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import load_config, AppConfig
from input_loader import load_targets
from email_generator import generate_email
from email_sender import DryRunEmailSender, SmtpEmailSender
from logger import append_log
from opt_out_filter import load_opt_outs, filter_targets
from recipient_registry import load_sent_recipients, filter_duplicates
from models import Contact, EmailDraft

# Set page layout and design theme
st.set_page_config(
    page_title="The Closer — Cold Outreach Console",
    page_icon="✉️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ----------------------------------------------------
# 1. State Management & Initialization
# ----------------------------------------------------
if "config" not in st.session_state:
    st.session_state.config = load_config()

if "current_index" not in st.session_state:
    st.session_state.current_index = 0

if "metrics" not in st.session_state:
    st.session_state.metrics = {"sent": 0, "drafted": 0, "skipped": 0, "failed": 0}

if "targets" not in st.session_state:
    st.session_state.targets = None

if "last_generated_idx" not in st.session_state:
    st.session_state.last_generated_idx = -1

if "editable_body" not in st.session_state:
    st.session_state.editable_body = ""

def reset_pipeline():
    st.session_state.current_index = 0
    st.session_state.metrics = {"sent": 0, "drafted": 0, "skipped": 0, "failed": 0}
    st.session_state.targets = None
    st.session_state.last_generated_idx = -1
    st.session_state.editable_body = ""

# ----------------------------------------------------
# 2. Main Dashboard Layout
# ----------------------------------------------------
st.title("✉️ The Closer — Cold Email Outreach Console")
st.markdown(
    "A safe-by-default, modular dashboard that generates, validates, refines, and delivers highly-personalized cold emails."
)

# Sidebar safety envelope summary
st.sidebar.title("🛡️ Safety Envelope Status")
cfg = st.session_state.config

# Display interactive credentials status
is_dry = st.sidebar.checkbox("🔒 DRY_RUN active (Mock mode)", value=cfg.dry_run)
cfg.dry_run = is_dry

send_mode_sel = st.sidebar.selectbox("Routing Send Mode", ["draft", "send"], index=0 if cfg.send_mode == "draft" else 1)
cfg.send_mode = send_mode_sel

max_cap = st.sidebar.number_input("Max targets limit per run", min_value=1, max_value=50, value=cfg.max_outreach_per_run)
cfg.max_outreach_per_run = int(max_cap)

# LLM Parameters configuration
st.sidebar.markdown("---")
st.sidebar.title("🤖 LLM Refinement Params")
llm_model_sel = st.sidebar.selectbox("Completion Model", ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"], index=0 if cfg.llm_model == "llama-3.1-8b-instant" else 1)
cfg.llm_model = llm_model_sel

groq_key_input = st.sidebar.text_input("Groq API Token", value=cfg.groq_api_key or "", type="password")
cfg.groq_api_key = groq_key_input.strip() if groq_key_input.strip() else None

# Action sidebar options
st.sidebar.markdown("---")
if st.sidebar.button("🔄 Reload Raw Configurations"):
    st.session_state.config = load_config()
    st.toast("Loaded initial `.env` settings!")
    st.rerun()

if st.sidebar.button("🔴 Reset Current Run"):
    reset_pipeline()
    st.toast("Pipeline state cleared!")
    st.rerun()

if st.sidebar.button("🗑️ Clear Outreach Logs (Reset History)"):
    if os.path.exists("outreach_log.csv"):
        try:
            os.remove("outreach_log.csv")
            st.toast("outreach_log.csv deleted successfully!")
        except Exception as e:
            st.error(f"Could not delete log file: {e}")
    if os.path.exists("outreach_log_backup.txt"):
        try:
            os.remove("outreach_log_backup.txt")
        except Exception:
            pass
    reset_pipeline()
    st.rerun()

# ----------------------------------------------------
# 3. Main Dashboard Content (Tabs)
# ----------------------------------------------------
tab_console, tab_ingest, tab_audit, tab_config = st.tabs([
    "📥 Outreach Console", 
    "🗃️ Target Directory", 
    "📈 Audit Trails & Analytics",
    "⚙️ Configuration Profile"
])

# ----------------------------------------------------
# Tab 3.1: Outreach Console
# ----------------------------------------------------
with tab_console:
    # Trigger initial loader if targets are empty
    if st.session_state.targets is None:
        try:
            # 1. Load contacts
            loaded_list = load_targets(cfg.input_path)
            
            # 2. Filter opt outs
            opt_outs = load_opt_outs("do_not_contact.csv")
            filtered_opt = filter_targets(loaded_list, opt_outs)
            
            # 3. Filter duplicates
            sent_set = load_sent_recipients("outreach_log.csv")
            filtered_dups = filter_duplicates(filtered_opt, sent_set)
            
            # 4. Slice to volume cap limit
            if len(filtered_dups) > cfg.max_outreach_per_run:
                filtered_dups = filtered_dups[:cfg.max_outreach_per_run]
                
            st.session_state.targets = filtered_dups
        except Exception as e:
            st.error(f"Failed to load outreach targets: {e}")
            st.session_state.targets = []

    targets = st.session_state.targets
    
    if not targets:
        st.info("No targets currently loaded. Either all targets were already emailed previously, or the targets list is empty. Go to the 'Target Directory' tab to select or upload a new database file!")
    elif st.session_state.current_index >= len(targets):
        # Batch Completed dashboard
        st.success("🎉 Outreach batch run completed successfully!")
        
        m = st.session_state.metrics
        st.markdown("### Batch Results Summary:")
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Emails Sent", m["sent"])
        col2.metric("Drafts Created", m["drafted"])
        col3.metric("Skipped Targets", m["skipped"])
        col4.metric("Failed Attempts", m["failed"])
        
        if st.button("Start New Batch"):
            reset_pipeline()
            st.rerun()
    else:
        # Load and process single contact
        contact_idx = st.session_state.current_index
        contact = targets[contact_idx]
        total_targets = len(targets)
        
        # Display progress bar
        progress_val = float(contact_idx) / float(total_targets)
        st.progress(progress_val, text=f"Processing Contact {contact_idx + 1} of {total_targets}")
        
        # Split layout into Profile Info and Email Draft Preview
        col_profile, col_email = st.columns([1, 2])
        
        with col_profile:
            st.subheader("👤 Recipient Profile")
            st.markdown(f"**Name:** {contact.recipient_name or 'N/A'}")
            st.markdown(f"**Email:** `{contact.recipient_email}`")
            st.markdown(f"**Company:** `{contact.company}`")
            st.markdown(f"**Role:** `{contact.role}`")
            st.markdown(f"**Candidate:** {contact.candidate_name}")
            st.markdown(f"**Background:** {contact.candidate_background}")
            
            if contact.job_url or contact.portfolio_url or contact.linkedin_url or contact.resume_link:
                st.markdown("---")
                st.markdown("**References & Links:**")
                if contact.job_url:
                    st.markdown(f"🔗 [Target Job Listing]({contact.job_url})")
                if contact.portfolio_url:
                    st.markdown(f"📁 [Portfolio]({contact.portfolio_url})")
                if contact.linkedin_url:
                    st.markdown(f"💼 [LinkedIn]({contact.linkedin_url})")
                if contact.resume_link:
                    st.markdown(f"📄 [Resume Link]({contact.resume_link})")
                    
            if contact.personalization_note:
                st.info(f"💡 **Personalization Note:**\n{contact.personalization_note}")
                
        with col_email:
            st.subheader("📝 Cold Outreach Draft Review")
            
            # Generate email only once per index
            if st.session_state.last_generated_idx != contact_idx:
                with st.spinner("Generating email draft..."):
                    draft = generate_email(contact, cfg)
                    st.session_state.editable_body = draft.body
                    st.session_state.last_generated_idx = contact_idx
                    st.session_state.cached_subject = draft.subject
                    
            subject = st.session_state.cached_subject
            st.text_input("Subject Line", value=subject, disabled=True)
            
            # Interactive premium editable area
            edited_body = st.text_area("Email Message Body (Editable)", value=st.session_state.editable_body, height=350)
            
            word_count = len(edited_body.split())
            if word_count > 150:
                st.warning(f"⚠️ Word count is {word_count} words (exceeds standard 150-word benchmark limit). Consider trimming!")
            else:
                st.success(f"✅ Word count check: {word_count} words (Standard <= 150 words limit).")
                
            # Delivery controls row
            st.markdown("### Operator Decisions:")
            c_send, c_draft, c_skip = st.columns(3)
            
            # Choose correct sender adapter
            sender = DryRunEmailSender() if cfg.dry_run else SmtpEmailSender()
            
            # Wrap in st.session_state to persist changes
            st.session_state.editable_body = edited_body
            updated_draft = EmailDraft(subject=subject, body=edited_body, word_count=word_count)
            
            if c_send.button("🚀 Approve & Send", use_container_width=True, type="primary"):
                with st.spinner("Delivering email..."):
                    res = sender.deliver(updated_draft, contact, cfg, mode="send")
                    if res.status == "failed":
                        st.error(f"Delivery failed: {res.error}")
                        append_log(contact, updated_draft, "failed", error_message=res.error or "")
                        st.session_state.metrics["failed"] += 1
                    else:
                        st.success(f"Email successfully delivered to {contact.recipient_email}!")
                        append_log(contact, updated_draft, "sent")
                        st.session_state.metrics["sent"] += 1
                        
                    st.session_state.current_index += 1
                    st.rerun()
                    
            if c_draft.button("📥 Approve & Save Draft Review", use_container_width=True):
                with st.spinner("Creating draft..."):
                    res = sender.deliver(updated_draft, contact, cfg, mode="draft")
                    if res.status == "failed":
                        st.error(f"Failed to create draft review: {res.error}")
                        append_log(contact, updated_draft, "failed", error_message=res.error or "")
                        st.session_state.metrics["failed"] += 1
                    else:
                        st.success(f"Draft review delivered to your inbox!")
                        append_log(contact, updated_draft, "drafted")
                        st.session_state.metrics["drafted"] += 1
                        
                    st.session_state.current_index += 1
                    st.rerun()
                    
            if c_skip.button("⏭️ Skip Target", use_container_width=True):
                append_log(contact, updated_draft, "skipped")
                st.session_state.metrics["skipped"] += 1
                st.info(f"Skipped outreach for {contact.recipient_email}.")
                st.session_state.current_index += 1
                st.rerun()

# ----------------------------------------------------
# Tab 3.2: Target Directory
# ----------------------------------------------------
with tab_ingest:
    st.subheader("📂 Targets Directory Registry")
    st.markdown("Displaying all targets loaded from the current workspace config file.")
    
    # Generate CSV template bytes for download
    sample_df = pd.DataFrame([{
        "recipient_email": "recruiter@company.com",
        "company": "ExampleCorp",
        "role": "Software Engineer",
        "candidate_name": "Jane Doe",
        "candidate_background": "5 years of Python experience developing web APIs.",
        "recipient_name": "Alex",
        "job_url": "https://company.com/jobs/123",
        "portfolio_url": "https://janedoe.dev",
        "personalization_note": "I love ExampleCorp's open-source developer tooling.",
        "linkedin_url": "https://linkedin.com/in/janedoe",
        "resume_link": "https://janedoe.dev/resume.pdf"
    }])
    sample_csv = sample_df.to_csv(index=False).encode('utf-8')

    col_file_info, col_upload = st.columns(2)
    
    with col_file_info:
        st.markdown(f"**Current Input Path:** `{cfg.input_path}`")
        if os.path.exists(cfg.input_path):
            st.success(f"Found input file: `{cfg.input_path}`")
        else:
            st.error(f"Input file not found at: `{cfg.input_path}`")
        st.download_button(
            label="📥 Download Template CSV",
            data=sample_csv,
            file_name="targets_template.csv",
            mime="text/csv",
            use_container_width=True
        )
            
    with col_upload:
        # File upload stretch goal
        uploaded_file = st.file_uploader("Upload custom targets file (.json or .csv)", type=["json", "csv"])
        if uploaded_file is not None:
            # Save uploaded file in the local workspace directory
            save_path = uploaded_file.name
            with open(save_path, "wb") as f:
                f.write(uploaded_file.getbuffer())
            cfg.input_path = save_path
            st.success(f"Saved and mapped input target to: `{save_path}`!")
            reset_pipeline()
            st.rerun()
            
    st.markdown("---")
    
    # Load and display directory database
    try:
        all_targets = load_targets(cfg.input_path)
        if all_targets:
            df_data = []
            for t in all_targets:
                df_data.append({
                    "Email": t.recipient_email,
                    "Recipient Name": t.recipient_name or "N/A",
                    "Company": t.company,
                    "Target Role": t.role,
                    "Candidate": t.candidate_name,
                    "Has Note": "Yes" if t.personalization_note else "No",
                    "Job Link": t.job_url or "N/A"
                })
            st.dataframe(pd.DataFrame(df_data), use_container_width=True)
        else:
            st.warning("Empty targets dataset found.")
    except Exception as e:
        st.error(f"Error reading target lists: {e}")

# ----------------------------------------------------
# Tab 3.3: Audit Trails & Analytics
# ----------------------------------------------------
with tab_audit:
    st.subheader("📈 Historical Outreach Performance & Audit Trail")
    
    log_path = "outreach_log.csv"
    
    if os.path.exists(log_path):
        try:
            df_logs = pd.read_csv(log_path)
            
            # Show high-level KPI metrics
            st.markdown("### Total historical metrics:")
            c1, c2, c3, c4 = st.columns(4)
            
            total_events = len(df_logs)
            sent_events = len(df_logs[df_logs["status"] == "sent"])
            draft_events = len(df_logs[df_logs["status"] == "drafted"])
            skip_events = len(df_logs[df_logs["status"] == "skipped"])
            fail_events = len(df_logs[df_logs["status"] == "failed"])
            
            c1.metric("Historical Runs Total", total_events)
            c2.metric("Total Emails Sent", sent_events, delta=f"{sent_events} delivered successfully")
            c3.metric("Inbox Drafts", draft_events)
            c4.metric("Failures trapped", fail_events, delta=f"{fail_events} aborted cleanly", delta_color="inverse")
            
            st.markdown("---")
            st.markdown("**Historical Outreach Logs:**")
            
            # Filter dropdown by status
            filter_status = st.selectbox("Filter logs by status", ["All", "sent", "drafted", "skipped", "failed"])
            
            if filter_status != "All":
                df_filtered = df_logs[df_logs["status"] == filter_status]
            else:
                df_filtered = df_logs
                
            # Chronological reverse order display
            st.dataframe(df_filtered.iloc[::-1], use_container_width=True)
            
            # Provide a download button for the logs
            csv_data = df_logs.to_csv(index=False).encode('utf-8')
            st.download_button(
                label="📥 Download Historical Audit Trail (CSV)",
                data=csv_data,
                file_name="outreach_log.csv",
                mime="text/csv",
                use_container_width=True
            )
            
        except Exception as e:
            st.error(f"Failed to read CSV audit logs: {e}")
    else:
        st.info("No audit logs found. Run the outreach console pipeline first to populate `outreach_log.csv`!")

# ----------------------------------------------------
# Tab 3.4: Configuration Profile
# ----------------------------------------------------
with tab_config:
    st.subheader("⚙️ Active Workspace Configuration Parameters")
    st.markdown("Below are the configuration settings retrieved from your active `.env` file settings.")
    
    # SMTP details preview card
    st.markdown("### SMTP Credentials Settings")
    col_h, col_p = st.columns(2)
    col_h.text_input("SMTP Host Server", value=cfg.smtp_host, disabled=True)
    col_p.text_input("SMTP Port (STARTTLS)", value=str(cfg.smtp_port), disabled=True)
    
    col_u, col_n = st.columns(2)
    col_u.text_input("SMTP User Account", value=cfg.smtp_user, disabled=True)
    col_n.text_input("Sender Display Name", value=cfg.sender_name, disabled=True)
    
    st.markdown("---")
    st.markdown("### LLM Refinement Credentials")
    st.text_input("Provider name", value=cfg.llm_provider, disabled=True)
