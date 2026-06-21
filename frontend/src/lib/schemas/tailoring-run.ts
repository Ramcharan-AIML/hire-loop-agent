import { z } from "zod";
import { ResumeProfileSchema } from "./resume";
import { JobDescriptionProfileSchema } from "./job-description";
import { MatchScoreSchema } from "./match-score";
import { TailoredResumeSchema } from "./tailored-resume";
import { GapAnalysisSchema } from "./gap-analysis";

export const TailoringRunSchema = z.object({
  runId: z.string(), // Allowing simple strings or UUIDs
  timestamp: z.string(),
  originalResume: ResumeProfileSchema,
  jobDescription: JobDescriptionProfileSchema,
  originalMatch: MatchScoreSchema,
  tailoredMatch: MatchScoreSchema,
  tailoredResume: TailoredResumeSchema,
  gapAnalysis: GapAnalysisSchema,
});

export type TailoringRun = z.infer<typeof TailoringRunSchema>;
