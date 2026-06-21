import { ResumeProfile } from "@/lib/schemas/resume";
import { JobDescriptionProfile } from "@/lib/schemas/job-description";

export function buildMatchScoringPrompt(
  resume: ResumeProfile,
  jd: JobDescriptionProfile
): { system: string; user: string } {
  const schemaOutline = `{
    "overallScore": 0-100,
    "skillCoverageScore": 0-100,
    "responsibilityAlignmentScore": 0-100,
    "keywordScore": 0-100,
    "seniorityScore": 0-100,
    "criticalMissingRequirements": ["string"],
    "explanation": "string (A narrative summary of 2-4 sentences explaining the match alignment diagnostics)"
  }`;

  return {
    system: `You are a critical, unbiased Technical Hiring Manager.
Your job is to objectively score a candidate's Resume against a target Job Description.

SCORING CRITERIA SPECIFICATION:
1. skillCoverageScore (30% weight): What percentage of JD required/preferred skills are represented?
2. responsibilityAlignmentScore (25% weight): Do the experience bullets map to the JD's listed responsibilities?
3. keywordScore (20% weight): Check for exact and close keyword matching density.
4. seniorityScore (15% weight): Does candidate's scope, years of experience, and job history map to JD seniority?
5. criticalMissingRequirements (10% weight penalty): List required items from the JD that are completely missing in the resume.
6. overallScore: Calculate the weighted aggregate of the individual sub-scores (0 to 100).
7. Return strict JSON matching the schema outlined below:
${schemaOutline}`,
    user: `Candidate Resume Profile:
${JSON.stringify(resume, null, 2)}

Target Job Description Profile:
${JSON.stringify(jd, null, 2)}

Calculate match scores:`,
  };
}
