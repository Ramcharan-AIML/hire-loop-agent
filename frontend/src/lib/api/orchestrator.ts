import { parseResume, parseJD, getScore, tailorResume, getGapAnalysis } from "./client";
import { TailoringRun } from "../schemas/tailoring-run";
import { ResumeProfile } from "../schemas/resume";

export type PipelineStage =
  | "parsing_resume"
  | "parsing_jd"
  | "scoring_original"
  | "tailoring"
  | "gap_analysis"
  | "scoring_tailored"
  | "idle";

interface OrchestratorOptions {
  resumeInput: { rawText: string } | FormData;
  jdText: string;
  onStageChange: (stage: PipelineStage) => void;
}

export async function runTailoringPipeline({
  resumeInput,
  jdText,
  onStageChange,
}: OrchestratorOptions): Promise<TailoringRun> {
  try {
    // 1. Stage 1: Parse Resume
    onStageChange("parsing_resume");
    const resumeRes = await parseResume(resumeInput);
    if (!resumeRes.success) {
      throw new Error(resumeRes.error || "Failed in Stage 1: Resume parsing failed.");
    }
    const originalResume = resumeRes.data;

    // 2. Stage 2: Parse JD
    onStageChange("parsing_jd");
    const jdRes = await parseJD(jdText);
    if (!jdRes.success) {
      throw new Error(jdRes.error || "Failed in Stage 2: Job description extraction failed.");
    }
    const jobDescription = jdRes.data;

    // 3. Stage 3: Initial Match Score
    onStageChange("scoring_original");
    const scoreOrigRes = await getScore(originalResume, jobDescription);
    if (!scoreOrigRes.success) {
      throw new Error(scoreOrigRes.error || "Failed in Stage 3: Initial match scoring failed.");
    }
    const originalMatch = scoreOrigRes.data;

    // 4. Stage 4: Resume Tailoring & Bullet Rephrase
    onStageChange("tailoring");
    const tailorRes = await tailorResume(originalResume, jobDescription, originalMatch);
    if (!tailorRes.success) {
      throw new Error(tailorRes.error || "Failed in Stage 4: Resume experience tailoring failed.");
    }
    const tailoredResume = tailorRes.data;

    // 5. Stage 5: Gaps Analysis
    onStageChange("gap_analysis");
    const gapsRes = await getGapAnalysis(originalResume, jobDescription, tailoredResume);
    if (!gapsRes.success) {
      throw new Error(gapsRes.error || "Failed in Stage 5: Gaps mapping analysis failed.");
    }
    const gapAnalysis = gapsRes.data;

    // 6. Stage 6: Re-Score Tailored Resume
    onStageChange("scoring_tailored");
    
    // We convert TailoredResume to ResumeProfile to calculate score accurately
    const tailoredResumeProfile: ResumeProfile = {
      contact: originalResume.contact,
      summary: tailoredResume.tailoredSummary,
      skills: tailoredResume.tailoredSkills,
      experience: tailoredResume.tailoredExperience.map((exp) => ({
        company: exp.company,
        title: exp.title,
        location: exp.location,
        startDate: exp.startDate,
        endDate: exp.endDate,
        bullets: exp.bullets.map((b) => b.tailored),
      })),
      projects: tailoredResume.tailoredProjects?.map((proj) => ({
        name: proj.name,
        description: proj.description,
        bullets: proj.bullets.map((b) => b.tailored),
        technologies: proj.technologies,
      })),
      education: originalResume.education,
      certifications: originalResume.certifications,
    };

    const scoreTailoredRes = await getScore(tailoredResumeProfile, jobDescription);
    if (!scoreTailoredRes.success) {
      throw new Error(scoreTailoredRes.error || "Failed in Stage 6: Tailored match scoring failed.");
    }
    const tailoredMatch = scoreTailoredRes.data;

    // Complete compilation of tailoring session
    const runId = `run_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    const timestamp = new Date().toISOString();

    onStageChange("idle");

    return {
      runId,
      timestamp,
      originalResume,
      jobDescription,
      originalMatch,
      tailoredMatch,
      tailoredResume,
      gapAnalysis,
    };
  } catch (err: any) {
    onStageChange("idle");
    console.error("Pipeline Orchestration Mismatch: ", err.message);
    throw err;
  }
}
