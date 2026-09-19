import { NextRequest, NextResponse } from "next/server";
import { LLMClient } from "@/lib/llm/client";
import { buildBulletRewriterPrompt } from "@/prompts/bullet-rewriter";
import { TailoredResumeSchema } from "@/lib/schemas/tailored-resume";
import type { TailoredBullet } from "@/lib/schemas/tailored-resume";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNVERIFIED_RISK =
  "No original bullet to compare against — this line was derived from the project description. Verify before sending.";

/**
 * Repair a tailored bullet list against the candidate's real source material
 * (EC-6.4: stretched bullet counts, and the empty-`original` case).
 *
 * Two things go wrong in practice:
 *   1. The model returns no bullets at all for a section.
 *   2. The model returns bullets whose `original` is empty — it happens on
 *      projects, which often carry a description but no bullet list, so there
 *      is nothing for it to quote verbatim.
 *
 * Rather than fail validation (which burned every retry and 500'd the whole
 * pipeline), restore provenance by index, then fall back to the section's
 * description. Anything still unverifiable is kept but marked low-confidence
 * and risk-flagged, so the review screen surfaces it instead of hiding it.
 */
function normalizeBullets(
  bullets: TailoredBullet[] | undefined,
  sourceBullets: string[],
  sourceDescription = ""
): TailoredBullet[] {
  // Case 1: nothing came back — mirror the originals unchanged.
  if (!bullets || bullets.length === 0) {
    return sourceBullets.map((b) => ({
      original: b,
      tailored: b,
      changeReason: "Aligned without modification.",
      keywordsAddressed: [],
      confidence: "high" as const,
    }));
  }

  // Case 2: repair each bullet's `original` so the diff view has something real.
  return bullets.map((bullet, idx) => {
    if (bullet.original && bullet.original.trim()) return bullet;

    const byIndex = sourceBullets[idx];
    if (byIndex) {
      return { ...bullet, original: byIndex };
    }

    if (sourceDescription.trim()) {
      return {
        ...bullet,
        original: sourceDescription,
        confidence: "medium" as const,
        riskFlag: bullet.riskFlag || UNVERIFIED_RISK,
      };
    }

    // Nothing to anchor to at all — keep the text but flag it loudly.
    return {
      ...bullet,
      original: bullet.tailored,
      confidence: "low" as const,
      riskFlag: bullet.riskFlag || UNVERIFIED_RISK,
    };
  });
}

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
      ["tailoredSummary", "tailoredSkills", "tailoredExperience", "tailoredProjects"]
    );

    if (!llmResponse.success) {
      return NextResponse.json(
        { success: false, error: llmResponse.error || "Failed to generate tailored resume bullets." },
        { status: 500 }
      );
    }

    const tailoredData = llmResponse.data!;

    // 2. Enforce 1:1 bullet mapping / restore provenance (EC-6.4)
    tailoredData.tailoredExperience = tailoredData.tailoredExperience.map((exp, idx) => {
      const source = resume.experience?.[idx];
      if (!source) return exp;
      return { ...exp, bullets: normalizeBullets(exp.bullets, source.bullets ?? []) };
    });

    // Projects were previously skipped here, which is exactly where the empty
    // `original` came from — they usually have a description and no bullets.
    tailoredData.tailoredProjects = tailoredData.tailoredProjects.map((proj, idx) => {
      const source =
        resume.projects?.find(
          (p: { name?: string }) =>
            p.name && proj.name && p.name.trim().toLowerCase() === proj.name.trim().toLowerCase()
        ) ?? resume.projects?.[idx];

      return {
        ...proj,
        bullets: normalizeBullets(proj.bullets, source?.bullets ?? [], source?.description ?? ""),
      };
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
