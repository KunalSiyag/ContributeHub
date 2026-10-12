import { NextResponse } from 'next/server';
import { askPrompt, ASK_LIMIT, readAskResult } from '@/lib/ask-search';
import { generateJSON, isAIAvailable } from '@/lib/gemini';
import { allowRequest, clientKey } from '@/lib/rate-limit';

/**
 * POST /api/discover/ask { question } — Discover filters for a request in
 * plain words. Twenty questions per ten minutes per visitor.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { question?: unknown } | null;
  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  if (!question || question.length > ASK_LIMIT) {
    return NextResponse.json({ error: `Describe what you want in up to ${ASK_LIMIT} characters.` }, { status: 400 });
  }
  if (!(await isAIAvailable())) return NextResponse.json({ available: false });
  if (!allowRequest(`ask:${clientKey(request)}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'That’s a lot of questions. Try again in a few minutes.' }, { status: 429 });
  }
  const result = readAskResult(await generateJSON(askPrompt(question), { maxOutputTokens: 300, timeoutMs: 15000 }));
  if (!result) return NextResponse.json({ available: true, error: 'Couldn’t turn that into a search. Try naming a language or a kind of task.' });
  return NextResponse.json({ available: true, result }, { headers: { 'Cache-Control': 'no-store' } });
}
