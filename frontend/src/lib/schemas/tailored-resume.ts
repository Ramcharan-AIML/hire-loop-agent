import { z } from "zod";
import { WorkExperienceSchema, ProjectSchema } from "./resume";

export const TailoredBulletSchema = z.object({
  // `original` is intentionally NOT `.min(1)`. A project that lists only a
  // description (no bullets) gives the model nothing to quote, so it emits an
  // empty `original`. Rejecting that here burned all 3 retries and failed the
  // whole pipeline; instead the /api/tailor route repairs the provenance and
  // downgrades confidence. See normalizeBullets() there.
  original: z.string().default(""),
  tailored: z.string().min(1, "Tailored bullet text is required"),
  changeReason: z.string().default("Aligned with the target job description."),
  keywordsAddressed: z.array(z.string()).default([]),
  confidence: z.enum(["high", "medium", "low"]).default("high"),
  riskFlag: z.string().optional().or(z.literal("")), // Warnings about potential overstatement
});

export const TailoredExperienceSchema = WorkExperienceSchema.extend({
  bullets: z.array(TailoredBulletSchema).default([]),
});

export const TailoredProjectSchema = ProjectSchema.extend({
  bullets: z.array(TailoredBulletSchema).default([]),
});

export const TailoredResumeSchema = z.object({
  tailoredSummary: z.string().default(""),
  tailoredSkills: z.array(z.string()).default([]),
  tailoredExperience: z.array(TailoredExperienceSchema).default([]),
  tailoredProjects: z.array(TailoredProjectSchema).default([]),
});

export type TailoredBullet = z.infer<typeof TailoredBulletSchema>;
export type TailoredExperience = z.infer<typeof TailoredExperienceSchema>;
export type TailoredProject = z.infer<typeof TailoredProjectSchema>;
export type TailoredResume = z.infer<typeof TailoredResumeSchema>;
