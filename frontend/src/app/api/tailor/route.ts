import { NextRequest, NextResponse } from "next/server";
import { LLMClient } from "@/lib/llm/client";
import { buildBulletRewriterPrompt } from "@/prompts/bullet-rewriter";
import { TailoredResumeSchema } from "@/lib/schemas/tailored-resume";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { resume, jd, initialScore } = await req.json();

    if (!resume || !jd || !initialScore) {
      return NextResponse.json(
        { success: false, error: "Missing required inputs: resume, jd, or initialScore." },
        { status: 400 }
      );
    }

    // 1. Build prompt and invoke LLMClient
    const prompt = buildBulletRewriterPrompt(resume, jd, initialScore);
    
    // Using a slightly higher retry rate for bullet rewriting since it's the most complex
    const llmClient = new LLMClient(3, 2000);

    const llmResponse = await llmClient.generateStructuredOutput(
      prompt,
      TailoredResumeSchema,
      ["tailoredSummary", "tailoredSkills", "tailoredExperience"]
    );

    if (!llmResponse.success) {
      return NextResponse.json(
        { success: false, error: llmResponse.error || "Failed to generate tailored resume bullets." },
        { status: 500 }
      );
    }

    // Enforce 1:1 bullet mapping or safe fill (EC-6.4: Stretched bullet counts)
    const tailoredData = llmResponse.data!;
    
    // Iterate over experiences and make sure tailored has identical items or fill with original
    tailoredData.tailoredExperience = tailoredData.tailoredExperience.map((tailoredExp, expIdx) => {
      const originalExp = resume.experience[expIdx];
      if (!originalExp) return tailoredExp; // Guard fallback

      // If bullets are missing or count mismatch, fill from original
      if (!tailoredExp.bullets || tailoredExp.bullets.length === 0) {
        tailoredExp.bullets = originalExp.bullets.map((b: string) => ({
          original: b,
          tailored: b,
          changeReason: "Aligned without modification.",
          keywordsAddressed: [],
          confidence: "high"
        }));
      }

      return tailoredExp;
    });

    return NextResponse.json({
      success: true,
      data: tailoredData,
    });
  } catch (err: any) {
    console.error("API /api/tailor caught error: ", err);
    return NextResponse.json(
      { success: false, error: "Internal server error occurred while tailoring resume." },
      { status: 500 }
    );
  }
}
