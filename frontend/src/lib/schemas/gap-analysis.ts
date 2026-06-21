import { z } from "zod";

export const ResumeGapSchema = z.object({
  name: z.string().min(1, "Gap name is required"),
  importance: z.enum(["high", "medium", "low"]).default("medium"),
  jdEvidence: z.string().default(""), // Quote from JD
  resumeEvidence: z.string().default(""), // Why we detected it as missing
  suggestedAction: z.string().min(1, "Suggested action is required"), // e.g. "Add if you have this..."
  canSafelyAdd: z.boolean().default(false), // Always false for fabrication prevention, unless user verifies
});

export const GapAnalysisSchema = z.object({
  gaps: z.array(ResumeGapSchema).default([]),
});

export type ResumeGap = z.infer<typeof ResumeGapSchema>;
export type GapAnalysis = z.infer<typeof GapAnalysisSchema>;
