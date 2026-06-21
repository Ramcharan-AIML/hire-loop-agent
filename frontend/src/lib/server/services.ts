/**
 * Server-only helpers for calling the two Python services from BFF route
 * handlers. Attaches the shared X-Internal-Key (architecture.md §10).
 *
 * Never import this from a client component — it reads server secrets.
 */
import "server-only";

const JOB_AGENT_URL = process.env.JOB_AGENT_URL ?? "http://localhost:8000";
const COLD_MAIL_URL = process.env.COLD_MAIL_URL ?? "http://localhost:8001";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? "";

export type ServiceTarget = "job-agent" | "cold-mail";

function baseUrl(target: ServiceTarget): string {
  return target === "job-agent" ? JOB_AGENT_URL : COLD_MAIL_URL;
}

export interface ServiceResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * POST JSON to a Python service. Returns a normalized result instead of throwing,
 * so route handlers can map upstream errors to friendly responses.
 */
export async function callService<T>(
  target: ServiceTarget,
  path: string,
  body: unknown,
  init?: { timeoutMs?: number; method?: string }
): Promise<ServiceResult<T>> {
  const url = `${baseUrl(target)}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? 180_000);

  try {
    const res = await fetch(url, {
      method: init?.method ?? "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": INTERNAL_API_KEY,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await res.text();
    let parsed: unknown = undefined;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = text;
    }

    if (!res.ok) {
      const detail =
        (parsed && typeof parsed === "object" && "detail" in parsed
          ? String((parsed as { detail: unknown }).detail)
          : undefined) ?? `Service returned ${res.status}`;
      return { ok: false, status: res.status, error: detail };
    }

    return { ok: true, status: res.status, data: parsed as T };
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      status: isAbort ? 504 : 502,
      error: isAbort
        ? "The service took too long to respond. Please try again."
        : `Could not reach the ${target} service. Is it running?`,
    };
  }
}
