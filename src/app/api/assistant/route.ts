import { NextResponse } from 'next/server';
import { ASSISTANT_SYSTEM, issueSearchContext, programContext, repoMention, repositoryContext, SEARCH_INTENT } from '@/lib/assistant';
import { generateAnswer, isAIAvailable, isWebSearchEnabled, type ChatTurn } from '@/lib/gemini';
import { jsonError, readJson } from '@/lib/api';
import { allowRequest, clientKey } from '@/lib/rate-limit';

interface Body {
  messages?: unknown;
  repo?: unknown;
  /** Ground the answer in a Google search (when the site enables it). */
  webSearch?: unknown;
}

const MAX_TURNS = 12;
const MAX_CHARS = 2000;
const PROGRAM_WORDS = /\b(gsoc|summer of code|gssoc|hacktoberfest|outreachy|lfx|mlh|fellowship|swoc|winter of code|program|programme|deadline|stipend|mentorship|internship|apply|application|proposal|season of)\b/i;

/**
 * POST /api/assistant — one assistant reply. The body carries the
 * conversation ({ role, text } turns, newest last) and optionally a
 * repository to ground the answer in.
 */
export async function POST(request: Request) {
  const body = await readJson<Body>(request);
  const turns: ChatTurn[] = (Array.isArray(body?.messages) ? body.messages : [])
    .map(entry => entry as { role?: unknown; text?: unknown })
    .filter(entry => (entry.role === 'user' || entry.role === 'model') && typeof entry.text === 'string' && entry.text.trim())
    .slice(-MAX_TURNS)
    .map(entry => ({ role: entry.role as ChatTurn['role'], text: (entry.text as string).slice(0, MAX_CHARS) }));
  const last = turns.at(-1);
  if (!last || last.role !== 'user') return jsonError(400, 'invalid_body', 'Send the conversation ending with a user message.');

  if (!(await isAIAvailable())) return NextResponse.json({ available: false });
  if (!allowRequest(`assistant:${clientKey(request)}`, 20, 10 * 60 * 1000)) {
    return jsonError(429, 'rate_limited', 'Too many questions in a short time. Try again in a few minutes.');
  }

  // Ground the answer: the repository in play, and programs when they come up.
  const explicit = typeof body?.repo === 'string' && /^[\w.-]+\/[\w.-]+$/.test(body.repo) ? body.repo : null;
  const repo = explicit ?? repoMention(last.text) ?? [...turns].reverse().map(turn => repoMention(turn.text)).find(Boolean) ?? null;
  const conversation = turns.map(turn => turn.text).join('\n');
  const [repoText, programText, issuesText] = await Promise.all([
    repo ? repositoryContext(repo) : Promise.resolve(null),
    PROGRAM_WORDS.test(conversation) ? programContext() : Promise.resolve(null),
    SEARCH_INTENT.test(last.text) ? issueSearchContext(last.text) : Promise.resolve(null),
  ]);

  const context = [repoText ?? (repo ? `CONTEXT: the repository ${repo} could not be found on GitHub.` : null), programText, issuesText]
    .filter(Boolean)
    .join('\n\n');
  const grounded: ChatTurn[] = context
    ? [...turns.slice(0, -1), { role: 'user', text: `${last.text}\n\n---\n${context}` }]
    : turns;

  // Web search when asked for and enabled; if Google refuses (quota, plan), answer without it.
  const wantsWeb = body?.webSearch === true && isWebSearchEnabled();
  const searched = wantsWeb ? await generateAnswer(ASSISTANT_SYSTEM, grounded, { maxOutputTokens: 1400, webSearch: true }) : null;
  const answer = searched ?? (await generateAnswer(ASSISTANT_SYSTEM, grounded, { maxOutputTokens: 1400 }));
  if (!answer) return NextResponse.json({ available: false });
  return NextResponse.json(
    {
      available: true,
      reply: answer.text,
      repo: repoText ? repo : null,
      sources: answer.sources,
      searchedIssues: Boolean(issuesText),
      webSearch: wantsWeb ? (searched ? 'used' : 'unavailable') : 'off',
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
