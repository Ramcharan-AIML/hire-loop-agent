import { JobDescriptionProfile } from "@/lib/schemas/job-description";

export function buildJDExtractionPrompt(rawJDText: string): { system: string; user: string } {
  const schemaOutline = `{
    "jobTitle": "string (Required)",
    "company": "string (Optional)",
    "requiredSkills": ["string"],
    "preferredSkills": ["string"],
    "responsibilities": ["string"],
    "qualifications": ["string"],
    "tools": ["string"],
    "keywords": ["string"],
    "seniorityLevel": "entry | mid | senior | lead | executive | unknown",
    "domainSignals": ["string"]
  }`;

  return {
    system: `You are an expert Technical Recruiter and Job Analyst.
Your task is to analyze raw, unformatted Job Description (JD) text and extract structured technical features.

DIRECTIONS:
1. Extract ALL core requirements, skills, qualifications, tools, and responsibilities.
2. Deduplicate and normalize skills (e.g. map 'react.js' to 'React').
3. Identify implied seniority Level (entry/mid/senior/lead/executive). If ambiguous, fallback to "unknown".
4. 'domainSignals' represents core industries or paradigms referenced (e.g., 'SaaS', 'FinTech', 'High-throughput APIs').
5. Output strict JSON matching the schema outlined below:
${schemaOutline}`,
    user: `Job Description Text:
"""
${rawJDText}
"""

Extract structured parameters:`,
  };
}
