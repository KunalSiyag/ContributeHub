import { NextResponse } from 'next/server';
import { extractSkillsFast, mergeAnalysisResults } from '@/lib/resume';
import { analyzeResumeWithAI, isAIAvailable } from '@/lib/gemini';
import { jsonError } from '@/lib/api';
import { allowRequest, clientKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024;

interface TextItem {
  str: string;
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Import the library entry directly: pdf-parse's index.js runs a debug
  // routine that reads a test fixture from disk.
  const { default: pdf } = await import('pdf-parse/lib/pdf-parse.js');
  // pdf-parse's bundled pdf.js mis-reads small Node Buffers ("bad XRef entry"); a Uint8Array view works.
  const data = await pdf(new Uint8Array(buffer), {
    pagerender: (page: { getTextContent: () => Promise<{ items: TextItem[] }> }) =>
      page.getTextContent().then(content => content.items.map(item => item.str).join(' ')),
  });
  return data.text;
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/** POST /api/resume (multipart: resume=<pdf|docx>, enhance=true|false) */
export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
    return jsonError(400, 'invalid_body', 'Upload the resume as multipart/form-data.');
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, 'invalid_body', 'Could not read the uploaded form.');
  }

  const file = form.get('resume');
  if (!(file instanceof File)) return jsonError(400, 'no_file', 'Choose a PDF or DOCX file to upload.');
  if (file.size === 0) return jsonError(400, 'empty_file', 'That file is empty.');
  if (file.size > MAX_BYTES) return jsonError(400, 'too_large', 'Files must be 5 MB or smaller.');

  const name = file.name.toLowerCase();
  const isPDF = name.endsWith('.pdf') || file.type === 'application/pdf';
  const isDOCX =
    name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (!isPDF && !isDOCX) return jsonError(400, 'unsupported_type', 'Upload a PDF or DOCX file.');

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = '';
  try {
    text = isPDF ? await extractTextFromPDF(buffer) : await extractTextFromDOCX(buffer);
  } catch {
    return jsonError(400, 'unreadable', 'We could not read that file. Make sure it is not password protected or corrupted.');
  }

  if (text.trim().length < 50) {
    return jsonError(400, 'no_text', 'No text found. Scanned or image-only resumes cannot be read; export a text PDF instead.');
  }

  const fast = extractSkillsFast(text);
  const wantsAI = form.get('enhance') === 'true';
  const aiAvailable = wantsAI ? await isAIAvailable() : false;
  let ai = null;
  let aiUsed = false;

  if (wantsAI && aiAvailable && allowRequest(`resume:${clientKey(request)}`, 6, 10 * 60 * 1000)) {
    ai = await analyzeResumeWithAI(text);
    aiUsed = Boolean(ai);
  }

  return NextResponse.json({
    analysis: mergeAnalysisResults(fast, ai),
    ai: { configured: aiAvailable, requested: wantsAI, used: aiUsed },
    textLength: text.length,
  });
}

export async function GET() {
  return NextResponse.json({ aiConfigured: await isAIAvailable(), formats: ['pdf', 'docx'], maxBytes: MAX_BYTES });
}
