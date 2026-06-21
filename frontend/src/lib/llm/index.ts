import { LLMAdapter, LLMProvider } from "./types";
import { GroqAdapter } from "./providers/groq";
import { GeminiAdapter } from "./providers/gemini";

export function getLLMAdapter(): LLMAdapter {
  const provider = (process.env.LLM_PROVIDER?.toLowerCase() as LLMProvider) || "groq";

  if (provider === "groq") {
    const apiKey = process.env.GROQ_API_KEY || "";
    const model = process.env.LLM_MODEL || "llama-3.3-70b-versatile";
    if (!apiKey) {
      throw new Error("GROQ_API_KEY environment variable is missing in .env.local.");
    }
    return new GroqAdapter(apiKey, model);
  }

  if (provider === "gemini") {
    const apiKey = process.env.GOOGLE_API_KEY || "";
    const model = process.env.LLM_MODEL || "gemini-2.0-flash";
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY environment variable is missing in .env.local.");
    }
    return new GeminiAdapter(apiKey, model);
  }

  throw new Error(`Unsupported LLM provider: ${provider}`);
}
