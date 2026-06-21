import { ResumeProfile } from "@/lib/schemas/resume";
import { JobDescriptionProfile } from "@/lib/schemas/job-description";
import { TailoredResume } from "@/lib/schemas/tailored-resume";

export function buildGapAnalysisPrompt(
  resume: ResumeProfile,
  jd: JobDescriptionProfile,
  tailoredResume: TailoredResume
): { system: string; user: string } {
  const schemaOutline = `{
    "gaps": [
      {
        "name": "string (The name of the missing technology, skill, or credential)",
        "importance": "high | medium | low",
        "jdEvidence": "string (Direct quote from the job description highlighting this requirement)",
        "resumeEvidence": "string (Why we assessed this as a gap - e.g. 'No mention of AWS or cloud deployment in profile')",
        "suggestedAction": "string (Actionable recommendation: e.g. 'Prepare to address in interview...', 'Mention in skills if familiar...')",
        "canSafelyAdd": false
      }
    ]
  }`;

  return {
    system: `You are an expert Career Coach and Technical Auditor.
Your task is to identify key required skills, certifications, tools, or responsibilities in the Job Description that could NOT be safely integrated into the tailored resume because doing so would fabricate experience.

DIRECTIONS:
1. Examine the original resume, tailored resume, and job description.
2. Compile a list of gaps for any REQUIRED or highly PREFERRED technologies/skills that are completely absent in the candidate's history.
3. Classify importance: 'high' (critical core qualifications), 'medium' (secondary preferred tools), or 'low' (nice-to-have items).
4. Provide a realistic suggested action:
   - For critical gaps: "Prepare to address this in your interview. Highlight adjacent experience (e.g. testing in Jest) and state a strong readiness to adopt this tool."
   - For secondary gaps: "Add this to your skills list if you possess basic hobby/academic familiarity."
5. Set 'canSafelyAdd' to false (all programmatic fabrications are blocked).
6. Output strict JSON matching the schema outlined below:
${schemaOutline}`,
    user: `Original Resume Profile:
${JSON.stringify(resume, null, 2)}

Target Job Description:
${JSON.stringify(jd, null, 2)}

Tailored Resume Outcome:
${JSON.stringify(tailoredResume, null, 2)}

Compile gaps analysis logs:`,
  };
}
