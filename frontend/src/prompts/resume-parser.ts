import { ResumeProfile } from "@/lib/schemas/resume";

export function buildResumeParserPrompt(rawResumeText: string): { system: string; user: string } {
  const schemaOutline = `{
    "contact": {
      "fullName": "string",
      "email": "string (Optional)",
      "phone": "string (Optional)",
      "location": "string (Optional)",
      "links": ["string (Valid URLs)"]
    },
    "summary": "string (Optional)",
    "skills": ["string"],
    "experience": [
      {
        "company": "string",
        "title": "string",
        "location": "string (Optional)",
        "startDate": "string",
        "endDate": "string (e.g. Present or date string)",
        "bullets": ["string"]
      }
    ],
    "projects": [
      {
        "name": "string",
        "description": "string (Optional)",
        "bullets": ["string"],
        "technologies": ["string"]
      }
    ],
    "education": [
      {
        "institution": "string",
        "degree": "string",
        "fieldOfStudy": "string (Optional)",
        "graduationDate": "string",
        "gpa": "string (Optional)"
      }
    ],
    "certifications": ["string"]
  }`;

  return {
    system: `You are an expert ATS (Applicant Tracking System) parser and CV compiler.
Your task is to parse raw unformatted text extracted from a resume and structure it into a perfect logical profile.

DIRECTIONS:
1. Reconstruct multi-column layouts chronologically. If text fragments appear interleaved, arrange them into logical job timelines.
2. Group skills into a clean list. Clean up typos and consolidate generic items.
3. Extract Contact Details, Professional Summary, Work Experience bullets, Projects, Education records, and Certifications.
4. If a field is missing (e.g. projects or certifications), output an empty array [] or omit the optional key, never invent fake entries.
5. Parse the dates exactly as written (e.g., "Oct 2022" or "Present").
6. Output strict JSON matching the schema structure outlined below:
${schemaOutline}`,
    user: `Raw Extracted Resume Text:
"""
${rawResumeText}
"""

Parse into structured JSON profile:`,
  };
}
