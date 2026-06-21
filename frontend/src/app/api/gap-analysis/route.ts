import { NextRequest, NextResponse } from "next/server";
import { LLMClient } from "@/lib/llm/client";
import { buildGapAnalysisPrompt } from "@/prompts/gap-analysis";
import { GapAnalysisSchema } from "@/lib/schemas/gap-analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { resume, jd, tailoredResume } = await req.json();

    if (!resume || !jd || !tailoredResume) {
      return NextResponse.json(
        { success: false, error: "Missing required inputs: resume, jd, or tailoredResume." },
        { status: 400 }
      );
    }

    // 1. Build prompt and invoke LLMClient
    const prompt = buildGapAnalysisPrompt(resume, jd, tailoredResume);
    const llmClient = new LLMClient();

    const llmResponse = await llmClient.generateStructuredOutput(
      prompt,
      GapAnalysisSchema,
      ["gaps"]
    );

    if (!llmResponse.success) {
      return NextResponse.json(
        { success: false, error: llmResponse.error || "Failed to structure gap analysis via LLM." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: llmResponse.data,
    });
  } catch (err: any) {
    console.error("API /api/gap-analysis caught error: ", err);
    return NextResponse.json(
      { success: false, error: "Internal server error occurred during gap analysis." },
      { status: 500 }
    );
  }
}
