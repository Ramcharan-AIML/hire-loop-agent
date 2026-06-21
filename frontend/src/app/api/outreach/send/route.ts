import { NextRequest, NextResponse } from "next/server";
import { callService } from "@/lib/server/services";
import { SendRequestSchema, LogEntrySchema } from "@/lib/schemas/platform";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = SendRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid send request." },
        { status: 400 }
      );
    }

    // Human-in-the-loop gate is also enforced by the Python service (409),
    // but reject early here too (architecture.md §10).
    if (!parsed.data.approved) {
      return NextResponse.json(
        { success: false, error: "Approval required before sending." },
        { status: 409 }
      );
    }

    const result = await callService("cold-mail", "/send", parsed.data, {
      timeoutMs: 60_000,
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error ?? "Send failed." },
        { status: result.status }
      );
    }

    const out = LogEntrySchema.safeParse(result.data);
    if (!out.success) {
      return NextResponse.json(
        { success: false, error: "Cold mail service returned an unexpected result." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, data: out.data });
  } catch (err) {
    console.error("API /api/outreach/send error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error during send." },
      { status: 500 }
    );
  }
}
