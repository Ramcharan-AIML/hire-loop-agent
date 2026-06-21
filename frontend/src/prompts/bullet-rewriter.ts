import { ResumeProfile } from "@/lib/schemas/resume";
import { JobDescriptionProfile } from "@/lib/schemas/job-description";
import { MatchScore } from "@/lib/schemas/match-score";

export function buildBulletRewriterPrompt(
  resume: ResumeProfile,
  jd: JobDescriptionProfile,
  initialScore: MatchScore
): { system: string; user: string } {
  const schemaOutline = `{
    "tailoredSummary": "string (Rewritten summary incorporating matching JD keywords)",
    "tailoredSkills": ["string (Skills re-ordered to prioritize JD required skills)"],
    "tailoredExperience": [
      {
        "company": "string",
        "title": "string",
        "startDate": "string",
        "endDate": "string",
        "bullets": [
          {
            "original": "string",
            "tailored": "string",
            "changeReason": "string (Why the bullet was changed to align with the JD)",
            "keywordsAddressed": ["string"],
            "confidence": "high | medium | low",
            "riskFlag": "string (Optional warning if the change stretches experience)"
          }
        ]
      }
    ],
    "tailoredProjects": [
      {
        "name": "string",
        "description": "string",
        "technologies": ["string"],
        "bullets": [
          {
            "original": "string",
            "tailored": "string",
            "changeReason": "string",
            "keywordsAddressed": ["string"],
            "confidence": "high | medium | low",
            "riskFlag": "string (Optional)"
          }
        ]
      }
    ]
  }`;

  return {
    system: `You are an elite Resume and Career Coach. Your job is to semantically align a candidate's Resume with a target Job Description (JD).

ABSOLUTE ETHICAL BOUNDARY & INTEGRITY RULES:
1. RULE 1 (Zero Fabrication): Do NOT invent metrics, tools, frameworks, databases, cloud providers, certifications, or employers. If a candidate does not have a skill (verified because it is absent everywhere in their original profile), do NOT add it.
2. RULE 2 (Semantic Rephrasing): You may adapt vocabulary to match the JD's preferred terms IF and ONLY IF the candidate's original bullet supports that concept. (e.g., rephrase 'maintained sites in React' to 'engineered responsive frontends in React' to match a JD requesting 'responsive engineering').
3. RULE 3 (Metrics Preservation): Keep all numerical percentages, dollar amounts, and count values exactly as-is from the original resume. Do NOT fabricate numbers (e.g. do not turn 'speed up queries' into 'speed up queries by 45%').
4. RULE 4 (Metadata Audit Log): For every single bullet, you must output:
   - 'original': The exact text of the original bullet.
   - 'tailored': The optimized bullet text.
   - 'changeReason': Explicit explanation of why and how this change aligns with the JD.
   - 'keywordsAddressed': Specific JD keywords targeted.
   - 'confidence': 'high' (well-supported rephrase), 'medium' (slight lexical stretch), or 'low' (significant inference).
   - 'riskFlag': Include a warning if the rephrasing borders on overstating experience or requires caution. If there is no risk, omit this field or return an empty string.

5. Reorder the 'skills' list to prioritize technologies and methodologies required by the JD. You may add basic familiarity descriptors to original skills (e.g., 'CI/CD (Concepts)') but do not invent entirely new fields.
6. Output strict JSON matching the target structure below:
${schemaOutline}`,
    user: `Candidate's Original Resume:
${JSON.stringify(resume, null, 2)}

Target Job Description:
${JSON.stringify(jd, null, 2)}

Current Initial Scoring Assessment:
${JSON.stringify(initialScore, null, 2)}

Generate tailored resume profile with bullet comparison logs:`,
  };
}
