import { NextRequest, NextResponse } from "next/server";
import { callService } from "@/lib/server/services";
import {
  DescriptionRequestSchema,
  DescriptionResponseSchema,
} from "@/lib/schemas/platform";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fetch the FULL description for one job listing.
 *
 * /api/jobs/search only returns listing-card metadata (title, company,
 * location, experience, skills) — the description lives on the detail page and
 * costs a rendered page load, so it is fetched on demand for the single job the
 * user actually picked.
 *
 * Rendering a detail page behind anti-bot protection is slow, hence the long
 * timeout and the tighter rate limit than search.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits: number[] = [];

export async function POST(req: NextRequest) {
  try {
    const now = Date.now();
    while (hits.length && now - hits[0] > WINDOW_MS) hits.shift();
    if (hits.length >= MAX_PER_WINDOW) {
      return NextResponse.json(
        { success: false, error: "Too many description fetches. Please wait a moment." },
        { status: 429 }
      );
    }
    hits.push(now);

    const json = await req.json();
    const parsed = DescriptionRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid job URL." },
        { status: 400 }
      );
    }

    const result = await callService("job-agent", "/job-description", parsed.data, {
      timeoutMs: 120_000,
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error ?? "Could not fetch the job description." },
        { status: result.status }
      );
    }

    const out = DescriptionResponseSchema.safeParse(result.data);
    if (!out.success) {
      return NextResponse.json(
        { success: false, error: "Job service returned an unexpected response." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, data: out.data });
  } catch (err) {
    console.error("API /api/jobs/description error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error while fetching the description." },
      { status: 500 }
    );
  }
}
