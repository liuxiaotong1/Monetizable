const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_LENGTH = 50_000;

export type CvParseResult =
  | { status: "parsed" | "limited"; text: string; fileName: string }
  | { status: "failed"; reason: "corrupted" | "scanned" | "unsupported" | "empty"; message: string; fileName: string };

function cleanText(text: string) {
  return text
    .replace(/\0/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

function hasProfessionalSignal(text: string) {
  return /(?:experience|employment|education|skills?|projects?|certifications?|work history|professional|manager|engineer|designer|consultant|analyst|developer|director|marketing|sales)/i.test(text);
}

async function renderPdfPage(pageData: { getTextContent(options?: object): Promise<{ items: Array<{ str?: string; transform?: number[] }> }> }) {
  const content = await pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
  const rows = new Map<number, Array<{ x: number; text: string }>>();
  for (const item of content.items) {
    const value = item.str?.trim();
    if (!value) continue;
    const x = item.transform?.[4] ?? 0;
    const y = Math.round((item.transform?.[5] ?? 0) / 3) * 3;
    const row = rows.get(y) ?? [];
    row.push({ x, text: value });
    rows.set(y, row);
  }
  return [...rows.entries()]
    .sort(([a], [b]) => b - a)
    .map(([, row]) => row.sort((a, b) => a.x - b.x).map((item) => item.text).join("  "))
    .join("\n");
}

export async function parseCvFile(file: File): Promise<CvParseResult> {
  if (file.size > MAX_FILE_BYTES) {
    return { status: "failed", reason: "unsupported", message: "This CV is larger than 8 MB.", fileName: file.name };
  }
  const extension = file.name.toLowerCase().split(".").pop();
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    let text = "";
    if (extension === "pdf" || file.type === "application/pdf") {
      const pdfParse = (await import("pdf-parse")).default;
      const parsed = await pdfParse(buffer, { pagerender: renderPdfPage });
      text = cleanText(parsed.text);
      if (!text) {
        return { status: "failed", reason: parsed.numpages > 0 ? "scanned" : "empty", message: parsed.numpages > 0 ? "This appears to be a scanned or image-only PDF, which we can’t reliably read yet." : "This PDF contains no readable text.", fileName: file.name };
      }
    } else if (extension === "docx" || file.type.includes("wordprocessingml")) {
      const mammoth = await import("mammoth");
      text = cleanText((await mammoth.extractRawText({ buffer })).value);
      if (!text) return { status: "failed", reason: "empty", message: "This DOCX contains no readable text.", fileName: file.name };
    } else {
      return { status: "failed", reason: "unsupported", message: "Use a PDF or DOCX file.", fileName: file.name };
    }
    return { status: hasProfessionalSignal(text) ? "parsed" : "limited", text, fileName: file.name };
  } catch (error) {
    console.error("CV parsing failure", { fileName: file.name, type: file.type, size: file.size, error });
    return { status: "failed", reason: "corrupted", message: "We couldn’t reliably read this file. It may be corrupted or use an unsupported document structure.", fileName: file.name };
  }
}

export function normalizeManualText(text: string) {
  return cleanText(text);
}
