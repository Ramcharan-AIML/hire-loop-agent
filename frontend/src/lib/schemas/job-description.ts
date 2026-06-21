import { z } from "zod";

export const JobDescriptionProfileSchema = z.object({
  jobTitle: z.string().min(1, "Job title is required"),
  company: z.string().nullable().optional().transform(val => val ?? "").default(""),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  qualifications: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  seniorityLevel: z.enum(["entry", "mid", "senior", "lead", "executive", "unknown"]).catch("unknown"),
  domainSignals: z.array(z.string()).default([]),
});

export type JobDescriptionProfile = z.infer<typeof JobDescriptionProfileSchema>;
