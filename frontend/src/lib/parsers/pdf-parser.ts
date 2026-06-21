import * as _pdfParse from "pdf-parse";

// Handle CommonJS / ESM default export differences
const pdfParse = ((_pdfParse as any).default || _pdfParse) as any;

export async function parsePDF(buffer: Buffer): Promise<{ text: string; error?: string }> {
  try {
    // Basic file header magic byte validation: PDF must start with '%PDF-'
    const magicString = buffer.subarray(0, 4).toString("utf-8");
    if (magicString !== "%PDF") {
      return {
        text: "",
        error: "This file is not a valid PDF document. Please verify the file extension or upload a text-based PDF.",
      };
    }

    const data = await pdfParse(buffer);
    const text = data.text ? data.text.trim() : "";

    // EC-4.1: Check if PDF contains scanned image text with less than 50 extractable characters
    if (text.replace(/\s/g, "").length < 50) {
      return {
        text: "",
        error: "This PDF appears to be a scanned image or empty. Please copy/paste your resume text instead, or upload a text-based PDF.",
      };
    }

    return { text };
  } catch (err: any) {
    console.error("PDF Parsing Error: ", err);
    return {
      text: "",
      error: "Unable to parse this PDF. The file may be password-protected or corrupted. Please copy/paste your resume text instead.",
    };
  }
}
