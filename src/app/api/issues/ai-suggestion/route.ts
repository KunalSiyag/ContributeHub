import { NextResponse } from 'next/server';
import { generateJSON, GEMINI_MODEL, isAIAvailable } from '@/lib/gemini';
import { jsonError, readJson } from '@/lib/api';
import { allowRequest, clientKey } from '@/lib/rate-limit';

interface Body {
  title?: unknown;
  body?: unknown;
  labels?: unknown;
  repo?: unknown;
}

interface Suggestion {
  summary: string;
  steps: string[];
  skills: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  timeEstimate: string;
}

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : '');

/**
 * POST /api/issues/ai-suggestion — an AI-drafted approach for an issue.
 * Responds { available: false } instead of fabricating output when AI is
 * not configured or the model call fails.
 */
export async function POST(request: Request) {
  const body = await readJson<Body>(request);
  const title = text(body?.title, 300);
  if (!title) return jsonError(400, 'invalid_body', 'Issue title is required.');

  if (!(await isAIAvailable())) {
    return NextResponse.json({ available: false, reason: 'unavailable' });
  }
  if (!allowRequest(`ai:${clientKey(request)}`, 12, 10 * 60 * 1000)) {
    return jsonError(429, 'rate_limited', 'Too many AI requests. Try again in a few minutes.');
  }

  const labels = Array.isArray(body?.labels)
    ? body.labels.filter((l): l is string => typeof l === 'string').slice(0, 10)
    : [];

  const prompt = `You help open source contributors plan a fix. Read the GitHub issue and respond with JSON only:
{"summary": string (1-2 sentences: what needs to change), "steps": string[] (3-5 concrete steps, each under 25 words),
 "skills": string[] (max 5 technologies or concepts), "difficulty": "easy" | "medium" | "hard",
 "timeEstimate": string (e.g. "2-4 hours")}
Be specific to this repository and issue. Do not invent file names you cannot infer.

Repository: ${text(body?.repo, 140)}
Title: ${title}
Labels: ${labels.join(', ') || 'none'}
Description:
${text(body?.body, 3000) || 'No description provided.'}`;

  const result = await generateJSON<Partial<Suggestion>>(prompt, { maxOutputTokens: 700 });
  if (!result || typeof result.summary !== 'string' || !Array.isArray(result.steps)) {
    return NextResponse.json({ available: false, reason: 'failed' });
  }

  const suggestion: Suggestion = {
    summary: result.summary.slice(0, 400),
    steps: result.steps.filter((s): s is string => typeof s === 'string').slice(0, 5),
    skills: Array.isArray(result.skills) ? result.skills.filter((s): s is string => typeof s === 'string').slice(0, 5) : [],
    difficulty: result.difficulty === 'easy' || result.difficulty === 'hard' ? result.difficulty : 'medium',
    timeEstimate: typeof result.timeEstimate === 'string' ? result.timeEstimate.slice(0, 40) : '',
  };

  return NextResponse.json({ available: true, model: GEMINI_MODEL, suggestion });
}
