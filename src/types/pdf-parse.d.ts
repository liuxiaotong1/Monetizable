declare module "pdf-parse" {
  interface PdfPage {
    getTextContent(options?: object): Promise<{
      items: Array<{ str?: string; transform?: number[] }>;
    }>;
  }

  interface PdfResult {
    numpages: number;
    text: string;
  }

  export default function pdfParse(
    data: Buffer,
    options?: { pagerender?: (page: PdfPage) => Promise<string> },
  ): Promise<PdfResult>;
}
