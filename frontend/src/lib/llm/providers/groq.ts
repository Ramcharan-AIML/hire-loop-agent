import Groq from "groq-sdk";
import { LLMAdapter } from "../types";

export class GroqAdapter implements LLMAdapter {
  private client: Groq;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel = "llama-3.3-70b-versatile") {
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not defined.");
    }
    this.client = new Groq({ apiKey });
    this.defaultModel = defaultModel;
  }

  async generateStructuredOutput<T>(
    prompt: { system: string; user: string },
    schema: any,
    schemaKeys: string[],
    model?: string,
    temperature?: number
  ): Promise<string> {
    const activeModel = model || this.defaultModel;
    const activeTemp = temperature !== undefined ? temperature : 0.3;

    // Enhance system prompt to strictly enforce JSON matching schema
    const enhancedSystemPrompt = `${prompt.system}\n\nCRITICAL: You MUST respond with a single, valid JSON object. Ensure all fields matching the target schema are fully populated. Target keys: [${schemaKeys.join(", ")}]. Do NOT include any markdown code blocks (e.g. \`\`\`json ... \`\`\`), conversational text, or wrapper tags. Return raw JSON only.`;

    try {
      const response = await this.client.chat.completions.create({
        model: activeModel,
        messages: [
          { role: "system", content: enhancedSystemPrompt },
          { role: "user", content: prompt.user },
        ],
        temperature: activeTemp,
        response_format: { type: "json_object" },
      });

      const text = response.choices[0]?.message?.content || "";
      if (!text) {
        throw new Error("Empty response returned from Groq chat completions.");
      }

      return text.trim();
    } catch (err: any) {
      console.error("Groq API Call Error: ", err);
      throw err;
    }
  }
}
