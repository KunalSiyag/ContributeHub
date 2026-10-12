import 'server-only';
import type { ResumeAnalysisResult } from './resume';

const API = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Override with GEMINI_MODEL; defaults to Google's current fast, low-cost model. */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

export function isAIConfigured(): boolean {
  return Boolean(process.env.GOOGLE_GEMINI_API_KEY);
}

/**
 * True when the key is set AND the configured model answers. The probe is a
 * cheap model lookup cached for an hour, so an invalid key or retired model
 * hides AI features instead of offering buttons that can only fail.
 */
export async function isAIAvailable(): Promise<boolean> {
  const key = process.env.GOOGLE_GEMINI_API_KEY;
  if (!key) return false;
  try {
    const response = await fetch(`${API}/${encodeURIComponent(GEMINI_MODEL)}`, {
      headers: { 'x-goog-api-key': key },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * One JSON-mode generateContent call. Returns null on any failure (missing
 * key, invalid key, retired model, timeout, malformed output) so callers can
 * say "AI unavailable" instead of inventing a result.
 */
export async function generateJSON<T>(prompt: string, { maxOutputTokens = 1024, timeoutMs = 20000 } = {}): Promise<T | null> {
  const key = process.env.GOOGLE_GEMINI_API_KEY;
  if (!key) return null;

  try {
    const response = await fetch(`${API}/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens, responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn(`Gemini request failed (${response.status}) for model ${GEMINI_MODEL}`);
      return null;
    }

    const data = await response.json();
    const text: string = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((part: { text?: string }) => part.text ?? '')
      .join('')
      .trim();
    if (!text) return null;
    const json = text.match(/\{[\s\S]*\}/)?.[0] ?? text;
    return JSON.parse(json) as T;
  } catch (err) {
    console.warn('Gemini request error:', err instanceof Error ? err.message : err);
    return null;
  }
}

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

/**
 * A plain-text (Markdown) reply to a conversation, steered by a system
 * instruction. Returns null on any failure, like generateJSON.
 */
export async function generateText(
  system: string,
  turns: ChatTurn[],
  { maxOutputTokens = 1200, timeoutMs = 30000, temperature = 0.3 } = {}
): Promise<string | null> {
  const key = process.env.GOOGLE_GEMINI_API_KEY;
  if (!key || turns.length === 0) return null;

  try {
    const response = await fetch(`${API}/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: turns.map(turn => ({ role: turn.role, parts: [{ text: turn.text }] })),
        generationConfig: { temperature, maxOutputTokens },
      }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    if (!response.ok) {
      console.warn(`Gemini request failed (${response.status}) for model ${GEMINI_MODEL}`);
      return null;
    }
    const data = await response.json();
    const text: string = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((part: { text?: string }) => part.text ?? '')
      .join('')
      .trim();
    return text || null;
  } catch (err) {
    console.warn('Gemini request error:', err instanceof Error ? err.message : err);
    return null;
  }
}

const strings = (value: unknown, max = 15) =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').map(v => v.trim()).filter(Boolean).slice(0, max) : [];

export async function analyzeResumeWithAI(resumeText: string): Promise<Partial<ResumeAnalysisResult> | null> {
  const prompt = `Extract skills from this resume. Respond with JSON only:
{"skills": string[] (programming languages only), "technologies": string[] (frameworks, libraries, tools, platforms),
 "interests": string[] (choose from: web, backend, mobile, devops, ml, data, security, docs, tooling, games, web3),
 "experienceLevel": "beginner" | "intermediate" | "advanced"}
Rules: only include items explicitly present in the resume. beginner = student or under 2 years; intermediate = 2-5 years; advanced = 5+ years or senior/staff/lead titles. Max 15 items per list.

Resume:
${resumeText.slice(0, 8000)}`;

  const parsed = await generateJSON<Record<string, unknown>>(prompt, { maxOutputTokens: 800 });
  if (!parsed) return null;

  const level = parsed.experienceLevel;
  return {
    skills: strings(parsed.skills),
    technologies: strings(parsed.technologies),
    interests: strings(parsed.interests, 6),
    experienceLevel: level === 'intermediate' || level === 'advanced' ? level : 'beginner',
  };
}
