import { getLLMAdapter } from "./index";
import { LLMResponse } from "./types";
import { ZodSchema } from "zod";

export class LLMClient {
  private maxRetries: number;
  private baseDelayMs: number;

  constructor(maxRetries = 3, baseDelayMs = 1500) {
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
  }

  // Sleep utility helper for backoff spacing
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Safe generator that executes the adapter, parses the raw JSON string, and asserts Zod validation.
   * If parsing fails or validation fails, it automatically retries with backoff.
   */
  async generateStructuredOutput<T>(
    prompt: { system: string; user: string },
    schema: ZodSchema<T>,
    schemaKeys: string[],
    temperature?: number
  ): Promise<LLMResponse<T>> {
    const adapter = getLLMAdapter();
    let attempt = 0;
    
    while (attempt < this.maxRetries) {
      attempt++;
      try {
        // 1. Invoke active provider adapter
        const rawJsonString = await adapter.generateStructuredOutput<T>(
          prompt,
          schema,
          schemaKeys,
          undefined, // Uses default model from factory config
          temperature
        );

        // 2. Attempt parsing
        let parsedObject: any;
        try {
          // Clean up potential markdown code block wrappers if model hallucinated them
          const cleanedJson = rawJsonString
            .replace(/^```json\s*/i, "")
            .replace(/```$/, "")
            .trim();
          
          parsedObject = JSON.parse(cleanedJson);
        } catch (parseErr: any) {
          console.warn(`[LLM Attempt ${attempt}] JSON Parse Failure: `, parseErr.message);
          if (attempt === this.maxRetries) {
            throw new Error(`Failed to parse LLM response into JSON. Raw response: ${rawJsonString.substring(0, 300)}...`);
          }
          await this.sleep(this.baseDelayMs * Math.pow(2, attempt));
          continue;
        }

        // 3. Assert Zod Schema Validation
        const zodResult = schema.safeParse(parsedObject);
        if (!zodResult.success) {
          console.warn(
            `[LLM Attempt ${attempt}] Zod Validation Failure: `,
            zodResult.error.message
          );
          if (attempt === this.maxRetries) {
            return {
              success: false,
              error: `Validation mismatch on final LLM parameters: ${zodResult.error.message.substring(0, 300)}...`,
              rawResponse: rawJsonString,
            };
          }
          await this.sleep(this.baseDelayMs * Math.pow(2, attempt));
          continue;
        }

        // 4. Perfect success!
        return {
          success: true,
          data: zodResult.data,
        };
      } catch (err: any) {
        console.warn(`[LLM Attempt ${attempt}] Request exception caught: `, err.message);
        
        if (attempt === this.maxRetries) {
          return {
            success: false,
            error: err.message || "An unexpected error occurred during API interaction.",
          };
        }

        // Exponential backoff space
        const delay = this.baseDelayMs * Math.pow(2, attempt);
        console.log(`Retrying after ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: "LLM Pipeline exhausted all retry spaces.",
    };
  }
}
