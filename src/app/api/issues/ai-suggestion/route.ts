import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

const SYSTEM_PROMPT = `You are an expert open source contributor assistant. Given a GitHub issue, provide a structured suggestion on how to fix it.

Your response must be valid JSON with this structure:
{
  "summary": "A 1-2 sentence summary of what needs to be done",
  "steps": ["Step 1 description", "Step 2 description", ...],
  "skills": ["skill1", "skill2", ...],
  "difficulty": "easy" | "medium" | "hard",
  "timeEstimate": "e.g. 1-2 hours, 1 day, etc."
}

Keep steps concise and actionable (max 5 steps). Skills should be technologies/concepts needed. Base difficulty on issue complexity. Be practical and helpful.`;

export async function POST(request: NextRequest) {
  try {
    const { title, body, labels, repo } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'Issue title is required' },
        { status: 400 }
      );
    }

    if (!GEMINI_API_KEY) {
      // Return mock data if no API key
      return NextResponse.json({
        summary: "This issue requires investigation and implementation based on the description provided.",
        steps: [
          "Read through the issue description and any linked resources",
          "Set up your local development environment",
          "Identify the relevant files and code sections",
          "Implement the fix or feature",
          "Write tests and submit a pull request"
        ],
        skills: labels?.slice(0, 3) || ["Programming", "Git"],
        difficulty: "medium",
        timeEstimate: "2-4 hours"
      });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    const prompt = `${SYSTEM_PROMPT}

GitHub Issue:
Repository: ${repo}
Title: ${title}
Labels: ${labels?.join(', ') || 'None'}
Description: ${body?.slice(0, 2000) || 'No description provided'}

Provide your JSON response:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in response');
    }

    const suggestion = JSON.parse(jsonMatch[0]);

    // Validate and sanitize response
    const validatedSuggestion = {
      summary: suggestion.summary || "Analysis required for this issue.",
      steps: Array.isArray(suggestion.steps) ? suggestion.steps.slice(0, 5) : ["Investigate the issue further"],
      skills: Array.isArray(suggestion.skills) ? suggestion.skills.slice(0, 5) : ["Programming"],
      difficulty: ['easy', 'medium', 'hard'].includes(suggestion.difficulty) ? suggestion.difficulty : 'medium',
      timeEstimate: suggestion.timeEstimate || "Varies"
    };

    return NextResponse.json(validatedSuggestion);
  } catch (error) {
    console.error('AI suggestion error:', error);
    
    // Return fallback on error
    return NextResponse.json({
      summary: "This issue needs further investigation. Check the description and repository documentation for context.",
      steps: [
        "Fork the repository and clone locally",
        "Read the contributing guidelines",
        "Understand the existing codebase",
        "Implement your changes",
        "Submit a well-documented PR"
      ],
      skills: ["Open Source", "Git", "Code Review"],
      difficulty: "medium",
      timeEstimate: "2-4 hours"
    });
  }
}
