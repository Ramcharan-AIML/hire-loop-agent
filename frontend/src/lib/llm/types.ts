export type LLMProvider = "groq" | "gemini";

export interface LLMConfig {
  apiKey: string;
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  maxRetries?: number;
}

export interface LLMResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  rawResponse?: string;
}

export interface LLMAdapter {
  generateStructuredOutput<T>(
    prompt: { system: string; user: string },
    schema: any, // Zod schema object
    schemaKeys: string[], // List of expected key names to help prompts
    model?: string,
    temperature?: number
  ): Promise<string>; // Returns raw JSON string which client will parse/validate
}
