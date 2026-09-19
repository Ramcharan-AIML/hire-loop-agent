/**
 * Single source of truth for model ids used across the Resume Engine.
 *
 * `openai/gpt-oss-120b` is OpenAI's open-weight 120B MoE model served by Groq.
 * It is a *reasoning* model: its chain-of-thought is billed as completion
 * tokens and returned on a separate `reasoning` field, so `content` stays
 * clean JSON. Because reasoning eats the completion budget, callers must use
 * `max_completion_tokens` generously and keep `reasoning_effort` low for the
 * structured-extraction work this app does.
 */
export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

/** Reasoning budget for gpt-oss models. Low = fast, enough for JSON extraction. */
export const DEFAULT_REASONING_EFFORT = "low" as const;

/** Upper bound on completion tokens (reasoning tokens count against this). */
export const DEFAULT_MAX_COMPLETION_TOKENS = 8192;

/** True for models that emit reasoning tokens (gpt-oss family on Groq). */
export function isReasoningModel(model: string): boolean {
  return model.toLowerCase().includes("gpt-oss");
}
