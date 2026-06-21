import { NextRequest, NextResponse } from "next/server";
import { callService } from "@/lib/server/services";
import { SearchRequestSchema, SearchResponseSchema } from "@/lib/schemas/platform";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Simple in-memory rate limit (architecture.md §10): scraping is slow + bot-detected.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits: number[] = [];

export async function POST(req: NextRequest) {
  try {
    // Rate limit
    const now = Date.now();
    while (hits.length && now - hits[0] > WINDOW_MS) hits.shift();
    if (hits.length >= MAX_PER_WINDOW) {
      return NextResponse.json(
        { success: false, error: "Too many searches. Please wait a moment and retry." },
        { status: 429 }
      );
    }
    hits.push(now);

    const json = await req.json();
    const parsed = SearchRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid search input." },
        { status: 400 }
      );
    }

    const result = await callService("job-agent", "/search", parsed.data, {
      timeoutMs: 170_000,
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error ?? "Job search failed." },
        { status: result.status }
      );
    }

    const out = SearchResponseSchema.safeParse(result.data);
    if (!out.success) {
      return NextResponse.json(
        { success: false, error: "Job service returned an unexpected response." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, data: out.data });
  } catch (err) {
    console.error("API /api/jobs/search error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error during job search." },
      { status: 500 }
    );
  }
}
