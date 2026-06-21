import { NextRequest, NextResponse } from "next/server";
import { LLMClient } from "@/lib/llm/client";
import { buildMatchScoringPrompt } from "@/prompts/match-scoring";
import { MatchScoreSchema } from "@/lib/schemas/match-score";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { resume, jd } = await req.json();

    if (!resume || !jd) {
      return NextResponse.json(
        { success: false, error: "Resume profile or Job Description profile is missing." },
        { status: 400 }
      );
    }

    // 1. Build prompt and invoke LLMClient
    const prompt = buildMatchScoringPrompt(resume, jd);
    const llmClient = new LLMClient();

    const llmResponse = await llmClient.generateStructuredOutput(
      prompt,
      MatchScoreSchema,
      ["overallScore", "skillCoverageScore", "responsibilityAlignmentScore", "keywordScore", "seniorityScore", "criticalMissingRequirements", "explanation"]
    );

    if (!llmResponse.success) {
      return NextResponse.json(
        { success: false, error: llmResponse.error || "Failed to calculate match score via LLM." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: llmResponse.data,
    });
  } catch (err: any) {
    console.error("API /api/score caught error: ", err);
    return NextResponse.json(
      { success: false, error: "Internal server error occurred while calculating score." },
      { status: 500 }
    );
  }
}
