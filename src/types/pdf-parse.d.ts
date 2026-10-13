declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PdfParseResult {
    text: string;
    numpages: number;
  }
  interface PdfParseOptions {
    pagerender?: (page: { getTextContent: () => Promise<{ items: Array<{ str: string }> }> }) => Promise<string>;
    max?: number;
  }
  export default function pdf(buffer: Buffer | Uint8Array, options?: PdfParseOptions): Promise<PdfParseResult>;
}
