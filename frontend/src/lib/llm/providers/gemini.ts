import { GoogleGenerativeAI } from "@google/generative-ai";
import { LLMAdapter } from "../types";

export class GeminiAdapter implements LLMAdapter {
  private client: GoogleGenerativeAI;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel = "gemini-2.0-flash") {
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY is not defined.");
    }
    this.client = new GoogleGenerativeAI(apiKey);
    this.defaultModel = defaultModel;
  }

  async generateStructuredOutput<T>(
    prompt: { system: string; user: string },
    schema: any,
    schemaKeys: string[],
    model?: string,
    temperature?: number
  ): Promise<string> {
    const activeModelName = model || this.defaultModel;
    const activeTemp = temperature !== undefined ? temperature : 0.3;

    try {
      const modelInstance = this.client.getGenerativeModel({
        model: activeModelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: activeTemp,
        },
      });

      // Gemini separates systemInstruction from chat history. We pass it in model options or combine.
      // In @google/generative-ai, we can pass systemInstruction directly in getGenerativeModel:
      const modelInstanceWithSystem = this.client.getGenerativeModel({
        model: activeModelName,
        systemInstruction: `${prompt.system}\n\nCRITICAL: You MUST respond with a single, valid JSON object matching the requested schema fields. Target keys: [${schemaKeys.join(", ")}]. Do NOT include conversational wrapping or markdown code ticks.`,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: activeTemp,
        },
      });

      const response = await modelInstanceWithSystem.generateContent(prompt.user);
      const text = response.response.text();
      
      if (!text) {
        throw new Error("Empty response returned from Google Gemini.");
      }

      return text.trim();
    } catch (err: any) {
      console.error("Gemini API Call Error: ", err);
      throw err;
    }
  }
}
