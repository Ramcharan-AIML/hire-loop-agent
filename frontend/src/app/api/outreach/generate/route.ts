import { NextRequest, NextResponse } from "next/server";
import { callService } from "@/lib/server/services";
import { OutreachContactSchema, EmailDraftSchema } from "@/lib/schemas/platform";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = OutreachContactSchema.safeParse(json?.contact ?? json);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid contact." },
        { status: 400 }
      );
    }

    const result = await callService("cold-mail", "/generate", { contact: parsed.data }, {
      timeoutMs: 60_000,
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error ?? "Email generation failed." },
        { status: result.status }
      );
    }

    const out = EmailDraftSchema.safeParse(result.data);
    if (!out.success) {
      return NextResponse.json(
        { success: false, error: "Cold mail service returned an unexpected draft." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, data: out.data });
  } catch (err) {
    console.error("API /api/outreach/generate error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error during email generation." },
      { status: 500 }
    );
  }
}
