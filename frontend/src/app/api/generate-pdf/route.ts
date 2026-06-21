import { NextRequest, NextResponse } from "next/server";
import { TailoringRunSchema } from "@/lib/schemas/tailoring-run";
import { pdf } from "@react-pdf/renderer";
import React from "react";
import TailoredResumeTemplate from "@/lib/pdf/tailored-resume-template";
import ProofReportTemplate from "@/lib/pdf/proof-report-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { runData, pdfType } = body;

    if (!runData || !pdfType) {
      return NextResponse.json(
        { success: false, error: "Missing runData or pdfType parameter." },
        { status: 400 }
      );
    }

    // 1. Zod validate the input runData
    const parsedRun = TailoringRunSchema.parse(runData);

    // 2. Select the correct PDF Template
    let element;
    if (pdfType === "resume") {
      element = React.createElement(TailoredResumeTemplate, { runData: parsedRun });
    } else if (pdfType === "proof") {
      element = React.createElement(ProofReportTemplate, { runData: parsedRun });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid pdfType parameter. Must be 'resume' or 'proof'." },
        { status: 400 }
      );
    }

    // 3. Compile the PDF to a Node Buffer
    const buffer = (await pdf(element as any).toBuffer()) as any;

    // 4. Formulate clean file names for attachment disposition
    const fullName = parsedRun.originalResume.contact.fullName.replace(/\s+/g, "_");
    const company = parsedRun.jobDescription.company.replace(/\s+/g, "_");
    const filename = pdfType === "resume"
      ? `${fullName}_Tailored_Resume_${company}.pdf`
      : `${fullName}_Proof_Report_${company}.pdf`;

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    if (buffer && typeof buffer.length === "number") {
      headers.set("Content-Length", buffer.length.toString());
    }
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    headers.set("Cache-Control", "no-store, max-age=0");

    return new Response(buffer, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error("PDF Route Generation Error: ", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate high-fidelity PDF." },
      { status: 500 }
    );
  }
}
