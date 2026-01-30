import { NextRequest, NextResponse } from 'next/server';
import { extractSkillsFast, mergeAnalysisResults, ResumeAnalysisResult } from '@/lib/resume';
import { analyzeResumeWithAI, isAIAvailable } from '@/lib/gemini';

// Dynamic import for server-side PDF parsing
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Use pdf-parse v1.1.1 with custom render to avoid canvas/DOMMatrix dependencies
  const pdf = require('pdf-parse/lib/pdf-parse');
  
  // Custom page render that just extracts text without canvas
  const options = {
    // Return text content from each page
    pagerender: function(pageData: any) {
      return pageData.getTextContent().then(function(textContent: any) {
        let text = '';
        for (const item of textContent.items) {
          text += item.str + ' ';
        }
        return text;
      });
    }
  };
  
  const data = await pdf(buffer, options);
  return data.text;
}

// Dynamic import for DOCX parsing
async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('resume') as File | null;
    const enhanceWithAI = formData.get('enhance') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'No resume file provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    const isPDF = fileName.endsWith('.pdf') || file.type === 'application/pdf';
    const isDOCX = fileName.endsWith('.docx') || 
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isPDF && !isDOCX) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a PDF or DOCX file.' },
        { status: 400 }
      );
    }

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract text based on file type
    let resumeText: string;
    try {
      if (isPDF) {
        resumeText = await extractTextFromPDF(buffer);
      } else {
        resumeText = await extractTextFromDOCX(buffer);
      }
    } catch (parseError) {
      console.error('Error parsing file:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse resume. Please ensure the file is not corrupted.' },
        { status: 400 }
      );
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Could not extract text from resume. The file may be empty or image-based.' },
        { status: 400 }
      );
    }

    // Fast extraction (always runs)
    const fastResult = extractSkillsFast(resumeText);

    // Optional AI enhancement
    let finalResult: ResumeAnalysisResult = fastResult;

    if (enhanceWithAI && isAIAvailable()) {
      try {
        const aiResult = await analyzeResumeWithAI(resumeText);
        finalResult = mergeAnalysisResults(fastResult, aiResult);
      } catch (aiError) {
        console.error('AI enhancement failed, using fast result:', aiError);
        // Continue with fast result only
      }
    }

    return NextResponse.json({
      success: true,
      analysis: finalResult,
      aiAvailable: isAIAvailable(),
      textLength: resumeText.length,
    });

  } catch (error) {
    console.error('Resume processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process resume' },
      { status: 500 }
    );
  }
}

// GET endpoint to check API status
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    aiAvailable: isAIAvailable(),
    supportedFormats: ['pdf', 'docx'],
    maxFileSize: '5MB',
  });
}
