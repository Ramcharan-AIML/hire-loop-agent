import { NextRequest, NextResponse } from "next/server";
import { LLMClient } from "@/lib/llm/client";
import { buildJDExtractionPrompt } from "@/prompts/jd-extraction";
import { JobDescriptionProfileSchema } from "@/lib/schemas/job-description";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { rawText } = await req.json();

    if (!rawText || !rawText.trim()) {
      return NextResponse.json(
        { success: false, error: "Job description text is empty." },
        { status: 400 }
      );
    }

    // 1. Build prompt and invoke LLMClient
    const prompt = buildJDExtractionPrompt(rawText);
    const llmClient = new LLMClient();

    const llmResponse = await llmClient.generateStructuredOutput(
      prompt,
      JobDescriptionProfileSchema,
      ["jobTitle", "requiredSkills", "preferredSkills", "responsibilities", "tools", "seniorityLevel"]
    );

    if (!llmResponse.success) {
      return NextResponse.json(
        { success: false, error: llmResponse.error || "Failed to parse job description via LLM." },
        { status: 500 }
      );
    }

    const jdData = llmResponse.data!;
    const warnings: string[] = [];

    // 2. Perform Sparse JD Depth Validation (Architecture §11.3)
    if (jdData.requiredSkills.length < 2 && jdData.responsibilities.length === 0) {
      warnings.push("Job description appears very sparse. Please consider adding more details (roles, skills, tools) for richer optimization matches.");
    }

    return NextResponse.json({
      success: true,
      data: jdData,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (err: any) {
    console.error("API /api/parse-jd caught error: ", err);
    return NextResponse.json(
      { success: false, error: "Internal server error occurred while parsing job description." },
      { status: 500 }
    );
  }
}
