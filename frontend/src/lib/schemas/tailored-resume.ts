import { z } from "zod";
import { WorkExperienceSchema, ProjectSchema } from "./resume";

export const TailoredBulletSchema = z.object({
  original: z.string().min(1, "Original bullet text is required"),
  tailored: z.string().min(1, "Tailored bullet text is required"),
  changeReason: z.string().min(1, "Reason for tailoring is required"),
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
