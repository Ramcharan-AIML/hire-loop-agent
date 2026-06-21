import mammoth from "mammoth";

export async function parseDOCX(buffer: Buffer): Promise<{ text: string; error?: string }> {
  try {
    // Magic byte validation: Word (DOCX) is a ZIP archive, starting with 'PK' (0x50, 0x4B)
    const magicString = buffer.subarray(0, 2).toString("utf-8");
    if (magicString !== "PK") {
      return {
        text: "",
        error: "This file is not a valid Word document (DOCX). Please verify the file extension or upload a text-based Word document.",
      };
    }

    const result = await mammoth.extractRawText({ buffer });
    const text = result.value ? result.value.trim() : "";

    if (result.messages && result.messages.length > 0) {
      console.warn("Mammoth extract warnings: ", result.messages);
    }

    if (text.replace(/\s/g, "").length < 50) {
      return {
        text: "",
        error: "This Word document appears to be empty or lacks extractable text.",
      };
    }

    return { text };
  } catch (err: any) {
    console.error("DOCX Parsing Error: ", err);
    return {
      text: "",
      error: "Unable to parse this Word document. Please ensure it is not corrupted and is in a modern DOCX format, or paste your resume text instead.",
    };
  }
}
