import sys
from models import Contact, EmailDraft
from config import AppConfig

def generate_email_template(contact: Contact) -> EmailDraft:
    """Generates a deterministic cold email draft using f-string templates.
    
    This acts as our MVP generator and safe fallback.
    """
    subject = f"Quick note on the {contact.role} role at {contact.company}"
    
    # 1. Greeting
    recipient = contact.recipient_name if contact.recipient_name else "there"
    greeting = f"Hi {recipient},"
    
    # 2. Personalization hook
    if contact.personalization_note:
        hook = contact.personalization_note
    else:
        hook = f"I noticed {contact.company} is seeking talent for the {contact.role} position."
        
    # 3. Introduction & 4. Value / fit
    intro = f"I'm {contact.candidate_name}. {contact.candidate_background}"
    fit = f"Given my background, I would love to explore how I can add value to the {contact.role} position at {contact.company}."
    
    # 5. One clear ask (CTA)
    cta = "Would you be open to a quick look at my profile or pointing me to the right person?"
    
    # 6. Sign-off
    sign_off_parts = ["Best,", contact.candidate_name]
    if contact.portfolio_url:
        sign_off_parts.append(contact.portfolio_url)
        
    sign_off = "\n".join(sign_off_parts)
    
    # Combine into full email body
    body = f"{greeting}\n\n{hook}\n\n{intro}\n\n{fit}\n\n{cta}\n\n{sign_off}"
    
    word_count = len(body.split())
    
    return EmailDraft(subject=subject, body=body, word_count=word_count)

def generate_email(contact: Contact, config: AppConfig | None = None) -> EmailDraft:
    """Main email generation entry point.
    
    Uses Groq LLM refinement if a valid API key and config are present,
    otherwise falls back gracefully to the deterministic template generator.
    """
    # Always generate the baseline template draft first
    base_draft = generate_email_template(contact)
    
    # If no config or no Groq key, use the template directly
    if not config or not config.groq_api_key:
        return base_draft
        
    try:
        from groq import Groq
        
        # Initialize Groq client
        client = Groq(api_key=config.groq_api_key)
        
        system_prompt = (
            "You are a professional assistant refining cold outreach emails for job applications.\n"
            "Your objective is to polish the provided baseline email draft to make it feel extremely "
            "premium, warm, engaging, and professional.\n\n"
            "You MUST strictly follow these safety and structure guardrails:\n"
            "1. WORD LIMIT: The refined email body must be under 150 words.\n"
            "2. NO HALLUCINATION: Do NOT invent or hallucinate any work experience, company achievements, "
            "referrals, relationships, or facts not explicitly provided in the baseline draft. Rely only "
            "on the facts provided.\n"
            "3. SIX-PART ANATOMY: The email must retain standard cold outreach anatomy:\n"
            "   - Professional greeting\n"
            "   - Tailored personalization hook (use the personalization note from the draft)\n"
            "   - Candidate introduction\n"
            "   - Value fit/contribution pitch\n"
            "   - Single clear ask / CTA (e.g., 'Would you be open to a quick look or pointing me to the right person?')\n"
            "   - Sign-off with name and portfolio if present.\n"
            "4. OUTPUT FORMAT: Respond ONLY with the refined email body text. Do not include any subject headers, "
            "preambles, markdown formatting blocks (like ```), or conversational intro/outro text."
        )
        
        user_prompt = (
            f"Please refine this baseline email body while respecting the safety guardrails:\n\n"
            f"--- BASELINE EMAIL BODY ---\n"
            f"{base_draft.body}\n"
            f"---------------------------\n\n"
            f"Candidate Name: {contact.candidate_name}\n"
            f"Target Company: {contact.company}\n"
            f"Target Role: {contact.role}\n"
            f"Candidate Background: {contact.candidate_background}\n"
        )
        
        # Request completion
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=config.llm_model,
            temperature=0.3,
            max_tokens=500
        )
        
        refined_body = completion.choices[0].message.content
        if not refined_body or not refined_body.strip():
            raise ValueError("Groq returned an empty response.")
            
        # Post-validation sanitization
        refined_body = refined_body.strip()
        
        # Strip accidental Subject: prefixes if the model included them
        if refined_body.lower().startswith("subject:"):
            lines = refined_body.splitlines()
            # Find first non-empty line after the subject line
            body_lines = []
            subject_found = False
            for line in lines:
                if line.lower().startswith("subject:"):
                    subject_found = True
                    continue
                # Skip subsequent empty lines if we just stripped the subject
                if subject_found and not body_lines and not line.strip():
                    continue
                body_lines.append(line)
            refined_body = "\n".join(body_lines).strip()
            
        # Strip code fences ``` if the model wrapped the output
        if refined_body.startswith("```"):
            refined_body = refined_body.strip("`").strip()
            
        refined_word_count = len(refined_body.split())
        
        # Guardrail: Enforce the 150-word ceiling
        if refined_word_count > 150:
            print(
                f"WARNING: Groq refined email word count ({refined_word_count}) exceeded the 150-word limit. "
                "Falling back to deterministic template.",
                file=sys.stderr
            )
            return base_draft
            
        return EmailDraft(
            subject=base_draft.subject,
            body=refined_body,
            word_count=refined_word_count
        )
        
    except Exception as e:
        print(
            f"WARNING: Groq email refinement failed due to error: {e}. "
            "Falling back to deterministic template.",
            file=sys.stderr
        )
        return base_draft
