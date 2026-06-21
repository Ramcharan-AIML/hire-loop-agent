import { z } from "zod";

/**
 * Shared platform contracts (mirrors packages/contracts/*.schema.json and the
 * Python pydantic models). See docs/architecture.md §4.
 *
 * Note: named with a `Platform`/`Outreach` prefix to avoid clashing with the
 * resume app's own ContactSchema in ./resume.ts.
 */

// --- JobRecord (Job Agent Service) ---
export const JobRecordSchema = z.object({
  job_title: z.string(),
  company: z.string(),
  location: z.string().default(""),
  salary: z.string().default(""),
  experience: z.string().default(""),
  skills: z.string().default(""),
  job_url: z.string().default(""),
  source: z.string().default(""),
  date_posted: z.string().default(""),
  date_scraped: z.string().default(""),
});
export type JobRecord = z.infer<typeof JobRecordSchema>;

export const SearchRequestSchema = z.object({
  role: z.string().min(1, "Role is required"),
  location: z.string().optional(),
  sources: z.array(z.string()).optional(),
  headless: z.boolean().optional(),
  limit: z.number().int().positive().optional(),
});
export type SearchRequest = z.infer<typeof SearchRequestSchema>;

export const SearchResponseSchema = z.object({
  count: z.number(),
  jobs: z.array(JobRecordSchema),
});

// --- Contact (Cold Mail Service) ---
export const OutreachContactSchema = z.object({
  recipient_email: z.string().email("A valid recruiter email is required"),
  company: z.string().min(1),
  role: z.string().min(1),
  candidate_name: z.string().min(1),
  candidate_background: z.string().min(1),
  recipient_name: z.string().nullable().optional(),
  job_url: z.string().nullable().optional(),
  portfolio_url: z.string().nullable().optional(),
  personalization_note: z.string().nullable().optional(),
  linkedin_url: z.string().nullable().optional(),
  resume_link: z.string().nullable().optional(),
});
export type OutreachContact = z.infer<typeof OutreachContactSchema>;

// --- EmailDraft (Cold Mail Service) ---
export const EmailDraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
  word_count: z.number().int().nonnegative(),
});
export type EmailDraft = z.infer<typeof EmailDraftSchema>;

// --- LogEntry (Cold Mail Service /send, /log) ---
export const LogEntrySchema = z.object({
  timestamp: z.string(),
  recipient_email: z.string(),
  company: z.string(),
  role: z.string(),
  subject: z.string(),
  status: z.string(),
  error_message: z.string().default(""),
});
export type LogEntry = z.infer<typeof LogEntrySchema>;

export const SendRequestSchema = z.object({
  contact: OutreachContactSchema,
  draft: EmailDraftSchema,
  approved: z.boolean(),
  dry_run: z.boolean().optional(),
  mode: z.enum(["draft", "send"]).optional(),
});
export type SendRequest = z.infer<typeof SendRequestSchema>;
