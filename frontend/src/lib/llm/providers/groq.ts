import Groq from "groq-sdk";
import { LLMAdapter } from "../types";
import {
  DEFAULT_GROQ_MODEL,
  DEFAULT_MAX_COMPLETION_TOKENS,
  DEFAULT_REASONING_EFFORT,
  isReasoningModel,
} from "../models";

export class GroqAdapter implements LLMAdapter {
  private client: Groq;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel = DEFAULT_GROQ_MODEL) {
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
      // gpt-oss models bill their chain-of-thought as completion tokens, so the
      // completion budget has to cover reasoning + the JSON payload. Keeping
      // reasoning_effort low avoids the model spending the budget thinking and
      // returning an empty `content`.
      const reasoningParams = isReasoningModel(activeModel)
        ? { reasoning_effort: DEFAULT_REASONING_EFFORT }
        : {};

      const response = await this.client.chat.completions.create({
        model: activeModel,
        messages: [
          { role: "system", content: enhancedSystemPrompt },
          { role: "user", content: prompt.user },
        ],
        temperature: activeTemp,
        max_completion_tokens: DEFAULT_MAX_COMPLETION_TOKENS,
        response_format: { type: "json_object" },
        ...reasoningParams,
      });

      const text = response.choices[0]?.message?.content || "";
      if (!text) {
        const finish = response.choices[0]?.finish_reason;
        throw new Error(
          finish === "length"
            ? `Groq returned no content: ${activeModel} hit the completion-token ceiling (reasoning tokens count toward it).`
            : "Empty response returned from Groq chat completions."
        );
      }

      return text.trim();
    } catch (err: any) {
      console.error("Groq API Call Error: ", err);
      throw err;
    }
  }
}
