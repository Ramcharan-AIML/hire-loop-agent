/**
 * Client-side helpers for the platform BFF routes (/api/jobs/*, /api/outreach/*).
 * These call same-origin Next.js route handlers, which proxy to the Python
 * services with the internal key attached server-side.
 */
import {
  JobRecord,
  OutreachContact,
  EmailDraft,
  LogEntry,
  SearchRequest,
} from "@/lib/schemas/platform";

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: ApiEnvelope<T> = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Request failed (${res.status})`);
  }
  return json.data as T;
}

export async function searchJobs(req: SearchRequest): Promise<{ count: number; jobs: JobRecord[] }> {
  return postJSON("/api/jobs/search", req);
}

export async function generateEmail(contact: OutreachContact): Promise<EmailDraft> {
  return postJSON("/api/outreach/generate", { contact });
}

export async function sendEmail(args: {
  contact: OutreachContact;
  draft: EmailDraft;
  approved: boolean;
  dry_run?: boolean;
  mode?: "draft" | "send";
}): Promise<LogEntry> {
  return postJSON("/api/outreach/send", args);
}
