"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTailoringStore } from "@/lib/store/tailoring-store";
import { generateEmail, sendEmail } from "@/lib/api/platform-client";
import { OutreachContact, EmailDraft } from "@/lib/schemas/platform";
import { Button } from "@/components/ui/button";
import { Mail, Sparkles, Send, FileText, AlertCircle, ShieldCheck, ArrowRight } from "lucide-react";

export default function OutreachPage() {
  const router = useRouter();
  const selectedJob = useTailoringStore((s) => s.selectedJob);
  const runData = useTailoringStore((s) => s.runData);
  const emailDraft = useTailoringStore((s) => s.emailDraft);
  const setEmailDraft = useTailoringStore((s) => s.setEmailDraft);
  const setSentLog = useTailoringStore((s) => s.setSentLog);
  const recipientEmail = useTailoringStore((s) => s.recipientEmail);
  const setRecipientEmail = useTailoringStore((s) => s.setRecipientEmail);
  const recipientName = useTailoringStore((s) => s.recipientName);
  const setRecipientName = useTailoringStore((s) => s.setRecipientName);

  // Collapse markdown links [text](url) -> text and trim stray fragments,
  // guarding against messy scraped values.
  const clean = (s: string) =>
    (s || "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[[\]]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  // ── Auto-fill mapping (architecture.md §4.4) ──────────────────────────
  const defaults = useMemo(() => {
    const company = clean(selectedJob?.company ?? runData?.jobDescription?.company ?? "");
    const role = clean(selectedJob?.job_title ?? runData?.jobDescription?.jobTitle ?? "");
    const candidate_name = runData?.originalResume?.contact?.fullName ?? "";
    const candidate_background =
      runData?.tailoredResume?.tailoredSummary ?? runData?.originalResume?.summary ?? "";
    const personalization_note = company && role
      ? `I noticed ${company} is hiring for the ${role} role and wanted to reach out directly.`
      : "";
    return { company, role, candidate_name, candidate_background, personalization_note };
  }, [selectedJob, runData]);

  const [company, setCompany] = useState(defaults.company);
  const [role, setRole] = useState(defaults.role);
  const [candidateName, setCandidateName] = useState(defaults.candidate_name);
  const [candidateBackground, setCandidateBackground] = useState(defaults.candidate_background);
  const [personalizationNote, setPersonalizationNote] = useState(defaults.personalization_note);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildContact = (): OutreachContact => ({
    recipient_email: recipientEmail.trim(),
    company: company.trim(),
    role: role.trim(),
    candidate_name: candidateName.trim() || "Candidate",
    candidate_background: candidateBackground.trim(),
    recipient_name: recipientName.trim() || null,
    job_url: selectedJob?.job_url || null,
    personalization_note: personalizationNote.trim() || null,
  });

  const validate = (): string | null => {
    if (!recipientEmail.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipientEmail.trim()))
      return "Enter a valid recruiter email address.";
    if (!company.trim() || !role.trim()) return "Company and role are required.";
    if (candidateBackground.trim().length < 10)
      return "Add a short candidate background (run the Tailor step or type one).";
    return null;
  };

  const handleGenerate = async () => {
    setError(null);
    const v = validate();
    if (v) return setError(v);
    setIsGenerating(true);
    try {
      const draft = await generateEmail(buildContact());
      setEmailDraft(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate the email.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async (mode: "send" | "draft") => {
    if (!emailDraft) return;
    setError(null);
    const v = validate();
    if (v) return setError(v);
    setIsSending(true);
    try {
      // approved=true is the explicit human-in-the-loop confirmation.
      const log = await sendEmail({ contact: buildContact(), draft: emailDraft, approved: true, mode });
      setSentLog(log);
      router.push("/done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send.");
    } finally {
      setIsSending(false);
    }
  };

  const updateDraftField = (patch: Partial<EmailDraft>) => {
    if (!emailDraft) return;
    const next = { ...emailDraft, ...patch };
    next.word_count = next.body.trim().split(/\s+/).filter(Boolean).length;
    setEmailDraft(next);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 w-full animate-fade-in-up">
      <div className="flex flex-col gap-1.5 text-center sm:text-left shrink-0 select-none">
        <h2 className="text-2xl font-bold tracking-tight text-text-primary">Outreach</h2>
        <p className="text-xs text-text-muted">
          We pre-filled the details from your job and tailored resume. Add the recruiter&apos;s email, generate, review, then approve.
        </p>
      </div>

      {!selectedJob && !runData && (
        <div className="flex items-center justify-between gap-3 text-xs bg-warning/10 border border-warning/20 rounded-xl p-4">
          <span className="text-text-muted">No job or tailored resume yet — start from Discover for the full flow.</span>
          <Link href="/discover"><Button className="h-9 rounded-lg text-xs font-bold bg-accent-primary text-white px-3">Go to Discover</Button></Link>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 text-xs font-semibold text-danger bg-danger/10 border border-danger/20 rounded-xl p-4 animate-fade-in-up">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          <p className="font-medium leading-relaxed">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: contact details */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4 bg-white border border-slate-200/80 shadow-sm">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Mail className="w-4 h-4 text-accent-primary" /> Recipient & details
          </h3>

          <Field label="Recruiter email *">
            <input value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="recruiter@company.com" className={inputCls} />
          </Field>
          <Field label="Recruiter name (optional)">
            <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g. Priya" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company *"><input value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} /></Field>
            <Field label="Role *"><input value={role} onChange={(e) => setRole(e.target.value)} className={inputCls} /></Field>
          </div>
          <Field label="Your name"><input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} className={inputCls} /></Field>
          <Field label="Candidate background (auto-filled from tailored resume)">
            <textarea value={candidateBackground} onChange={(e) => setCandidateBackground(e.target.value)}
              rows={3} className={inputCls + " resize-y py-2"} />
          </Field>
          <Field label="Personalization note">
            <textarea value={personalizationNote} onChange={(e) => setPersonalizationNote(e.target.value)}
              rows={2} className={inputCls + " resize-y py-2"} />
          </Field>

          <Button onClick={handleGenerate} disabled={isGenerating}
            className="h-11 rounded-xl text-sm font-bold bg-accent-primary hover:bg-accent-primary/90 text-white shadow-sm cursor-pointer">
            {isGenerating ? (
              <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating…</span>
            ) : (
              <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4" />{emailDraft ? "Regenerate Draft" : "Generate Draft"}</span>
            )}
          </Button>
        </div>

        {/* Right: approval card */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4 bg-white border border-slate-200/80 shadow-sm min-h-[300px]">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent-secondary" /> Review & approve
          </h3>

          {!emailDraft ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-text-muted select-none py-10">
              <Mail className="w-8 h-8 opacity-40" />
              <p className="text-xs">Generate a draft to preview it here before sending.</p>
            </div>
          ) : (
            <>
              <Field label="Subject">
                <input value={emailDraft.subject} onChange={(e) => updateDraftField({ subject: e.target.value })} className={inputCls} />
              </Field>
              <Field label={`Body (${emailDraft.word_count} words)`}>
                <textarea value={emailDraft.body} onChange={(e) => updateDraftField({ body: e.target.value })}
                  rows={12} className={inputCls + " resize-y py-2 font-mono text-[12px] leading-relaxed"} />
              </Field>

              <div className="flex items-center gap-2 text-[11px] text-text-muted bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                Sending requires your approval. The server runs in dry-run unless DRY_RUN is disabled.
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => handleSend("send")} disabled={isSending}
                  className="flex-1 h-11 rounded-xl text-sm font-bold bg-success hover:bg-success/90 text-white shadow-sm cursor-pointer">
                  {isSending ? "Working…" : (<span className="flex items-center gap-1.5"><Send className="w-4 h-4" />Approve & Send</span>)}
                </Button>
                <Button onClick={() => handleSend("draft")} disabled={isSending} variant="outline"
                  className="flex-1 h-11 rounded-xl text-sm font-bold border-slate-200 text-text-primary bg-white cursor-pointer">
                  Save as Draft
                </Button>
              </div>
              <Link href="/done" className="text-center text-[11px] text-text-muted hover:text-text-primary underline-offset-2 hover:underline">
                Skip sending <ArrowRight className="inline w-3 h-3" />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wide text-text-muted">{label}</label>
      {children}
    </div>
  );
}
