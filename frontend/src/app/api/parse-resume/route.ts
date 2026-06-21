import { NextRequest, NextResponse } from "next/server";
import { parsePDF } from "@/lib/parsers/pdf-parser";
import { parseDOCX } from "@/lib/parsers/docx-parser";
import { LLMClient } from "@/lib/llm/client";
import { buildResumeParserPrompt } from "@/prompts/resume-parser";
import { ResumeProfileSchema } from "@/lib/schemas/resume";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let rawText = "";

    // 1. Determine if request is multipart/form-data (file upload) or JSON (raw text)
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file was uploaded." },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const extension = "." + file.name.split(".").pop()?.toLowerCase();

      let parseResult: { text: string; error?: string };
      if (extension === ".pdf") {
        parseResult = await parsePDF(buffer);
      } else if (extension === ".docx") {
        parseResult = await parseDOCX(buffer);
      } else {
        return NextResponse.json(
          { success: false, error: "Unsupported file extension. Only PDF and DOCX files are allowed." },
          { status: 415 }
        );
      }

      if (parseResult.error) {
        return NextResponse.json(
          { success: false, error: parseResult.error },
          { status: 422 }
        );
      }

      rawText = parseResult.text;
    } else {
      // Direct raw text paste
      const body = await req.json();
      rawText = body.rawText || "";
    }

    if (!rawText.trim() || rawText.trim().length < 50) {
      return NextResponse.json(
        { success: false, error: "Extracted resume content is empty or extremely short." },
        { status: 400 }
      );
    }

    // 2. Build parser prompt and run LLMClient
    const prompt = buildResumeParserPrompt(rawText);
    const llmClient = new LLMClient();
    
    const llmResponse = await llmClient.generateStructuredOutput(
      prompt,
      ResumeProfileSchema,
      ["contact", "skills", "experience", "education"]
    );

    if (!llmResponse.success) {
      return NextResponse.json(
        { success: false, error: llmResponse.error || "Failed to structure resume text via LLM." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: llmResponse.data,
      text: rawText, // Keep raw text preview for UI
    });
  } catch (err: any) {
    console.error("API /api/parse-resume caught error: ", err);
    return NextResponse.json(
      { success: false, error: "Internal server error occurred while parsing resume." },
      { status: 500 }
    );
  }
}
