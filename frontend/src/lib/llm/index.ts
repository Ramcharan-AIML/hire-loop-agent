import { LLMAdapter, LLMProvider } from "./types";
import { GroqAdapter } from "./providers/groq";
import { GeminiAdapter } from "./providers/gemini";
import { DEFAULT_GEMINI_MODEL, DEFAULT_GROQ_MODEL } from "./models";

export function getLLMAdapter(): LLMAdapter {
  const provider = (process.env.LLM_PROVIDER?.toLowerCase() as LLMProvider) || "groq";

  if (provider === "groq") {
    const apiKey = process.env.GROQ_API_KEY || "";
    const model = process.env.LLM_MODEL || DEFAULT_GROQ_MODEL;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY environment variable is missing in .env.local.");
    }
    return new GroqAdapter(apiKey, model);
  }

  if (provider === "gemini") {
    const apiKey = process.env.GOOGLE_API_KEY || "";
    const model = process.env.LLM_MODEL || DEFAULT_GEMINI_MODEL;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY environment variable is missing in .env.local.");
    }
    return new GeminiAdapter(apiKey, model);
  }

  throw new Error(`Unsupported LLM provider: ${provider}`);
}
