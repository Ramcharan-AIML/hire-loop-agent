import { ResumeProfile } from "../schemas/resume";
import { JobDescriptionProfile } from "../schemas/job-description";
import { MatchScore } from "../schemas/match-score";
import { TailoredResume } from "../schemas/tailored-resume";
import { GapAnalysis } from "../schemas/gap-analysis";

async function safeResponseJson<T>(response: Response, context: string): Promise<T> {
  try {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      console.error(`Non-JSON response from ${context} (status ${response.status}):`, text.substring(0, 500));
      
      // Look for indicators that environment variables are missing
      if (text.includes("environment variable") || text.includes("API_KEY") || text.includes("missing")) {
        return {
          success: false,
          error: "Vercel Config Error: The LLM API key (GROQ_API_KEY or GOOGLE_API_KEY) is missing in your Vercel Project Environment Variables. Please add the required environment variable on the Vercel Dashboard and re-deploy."
        } as any;
      }

      if (response.status === 404) {
        return {
          success: false,
          error: `API Route Not Found (Status 404): The API endpoint for ${context} could not be found. Please check your deployment routing.`
        } as any;
      }

      if (response.status === 504) {
        return {
          success: false,
          error: `Gateway Timeout (Status 504): The Vercel serverless function for ${context} timed out. This can happen on Vercel Hobby plans if the LLM provider is exceptionally slow.`
        } as any;
      }

      return {
        success: false,
        error: `Server Error (Status ${response.status}): The server returned an HTML error page. This usually points to a Serverless Function crash or a missing environment variable (such as GROQ_API_KEY) in Vercel settings.`
      } as any;
    }

    const data = await response.json();
    return data;
  } catch (err: any) {
    console.error(`JSON Parse Error in ${context}:`, err);
    return {
      success: false,
      error: `Response Parse Failure: ${err.message || "Invalid JSON output formatting from the server."}`
    } as any;
  }
}

export async function parseResume(payload: { rawText: string } | FormData): Promise<{ success: boolean; data: ResumeProfile; text: string; error?: string }> {
  const isFormData = payload instanceof FormData;
  const response = await fetch("/api/parse-resume", {
    method: "POST",
    headers: isFormData ? {} : { "Content-Type": "application/json" },
    body: isFormData ? payload : JSON.stringify(payload),
  });
  return safeResponseJson<{ success: boolean; data: ResumeProfile; text: string; error?: string }>(response, "parsing resume");
}

export async function parseJD(rawText: string): Promise<{ success: boolean; data: JobDescriptionProfile; warnings?: string[]; error?: string }> {
  const response = await fetch("/api/parse-jd", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawText }),
  });
  return safeResponseJson<{ success: boolean; data: JobDescriptionProfile; warnings?: string[]; error?: string }>(response, "parsing job description");
}

export async function getScore(resume: ResumeProfile, jd: JobDescriptionProfile): Promise<{ success: boolean; data: MatchScore; error?: string }> {
  const response = await fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume, jd }),
  });
  return safeResponseJson<{ success: boolean; data: MatchScore; error?: string }>(response, "calculating match score");
}

export async function tailorResume(
  resume: ResumeProfile,
  jd: JobDescriptionProfile,
  initialScore: MatchScore
): Promise<{ success: boolean; data: TailoredResume; error?: string }> {
  const response = await fetch("/api/tailor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume, jd, initialScore }),
  });
  return safeResponseJson<{ success: boolean; data: TailoredResume; error?: string }>(response, "tailoring resume experience");
}

export async function getGapAnalysis(
  resume: ResumeProfile,
  jd: JobDescriptionProfile,
  tailoredResume: TailoredResume
): Promise<{ success: boolean; data: GapAnalysis; error?: string }> {
  const response = await fetch("/api/gap-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume, jd, tailoredResume }),
  });
  return safeResponseJson<{ success: boolean; data: GapAnalysis; error?: string }>(response, "mapping gaps analysis");
}
