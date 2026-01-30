// Gemini AI Integration for Enhanced Resume Analysis
// Used for optional deep analysis when user requests it

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ResumeAnalysisResult } from './resume';

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

const ANALYSIS_PROMPT = `Analyze this resume text and extract the following information in JSON format:

{
  "skills": ["array of programming languages found"],
  "technologies": ["array of frameworks, tools, and platforms"],
  "interests": ["array from: web, mobile, machine-learning, devops, security, blockchain, database, api, frontend, backend, testing, documentation, cli"],
  "experienceLevel": "one of: beginner, intermediate, advanced",
  "summary": "one sentence about the candidate's focus area"
}

Rules:
- Only include skills/technologies explicitly mentioned
- For experienceLevel: beginner = 0-1 years or student, intermediate = 2-5 years, advanced = 5+ years or senior titles
- Keep arrays concise, max 15 items each
- Be strict: only extract what's clearly stated

Resume text:
`;

/**
 * Use Gemini AI for deeper resume analysis
 * Returns enhanced skill extraction with context understanding
 */
export async function analyzeResumeWithAI(resumeText: string): Promise<Partial<ResumeAnalysisResult>> {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not configured, skipping AI analysis');
    return {};
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Truncate very long resumes to avoid token limits
    const truncatedText = resumeText.slice(0, 8000);
    
    const result = await model.generateContent(ANALYSIS_PROMPT + truncatedText);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in Gemini response');
      return {};
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      technologies: Array.isArray(parsed.technologies) ? parsed.technologies : [],
      interests: Array.isArray(parsed.interests) ? parsed.interests : [],
      experienceLevel: validateExperienceLevel(parsed.experienceLevel),
      confidence: 85, // AI extraction has high confidence
    };
  } catch (error) {
    console.error('Gemini AI analysis failed:', error);
    return {};
  }
}

function validateExperienceLevel(level: string): 'beginner' | 'intermediate' | 'advanced' {
  if (level === 'beginner' || level === 'intermediate' || level === 'advanced') {
    return level;
  }
  return 'beginner';
}

/**
 * Check if Gemini API is configured and available
 */
export function isAIAvailable(): boolean {
  return !!GEMINI_API_KEY;
}
