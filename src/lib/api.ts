import 'server-only';
import { NextResponse } from 'next/server';
import { GitHubError, describeReset } from './github';

/** Parse an integer query param, clamped to [min, max], with a fallback for junk. */
export function intParam(value: string | null, { min, max, fallback }: { min: number; max: number; fallback: number }) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/** Return `value` if it is one of `allowed`, else `fallback`. */
export function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Comma-separated list param, trimmed, de-duplicated, capped. */
export function listParam(value: string | null, max = 10): string[] {
  if (!value) return [];
  return Array.from(new Set(value.split(',').map(item => item.trim()).filter(Boolean))).slice(0, max);
}

export interface ApiErrorBody {
  error: string;
  message: string;
  resetAt?: number;
}

export function jsonError(status: number, error: string, message: string, extra?: Partial<ApiErrorBody>) {
  return NextResponse.json<ApiErrorBody>({ error, message, ...extra }, { status });
}

/** Map any thrown error to a safe JSON response (no upstream bodies leak). */
export function errorResponse(err: unknown) {
  if (err instanceof GitHubError) {
    if (err.rateLimited) {
      return jsonError(
        429,
        'rate_limited',
        `GitHub's rate limit was reached. Results return ${describeReset(err.resetAt)}.`,
        { resetAt: err.resetAt }
      );
    }
    if (err.status === 404) return jsonError(404, 'not_found', 'That item was not found on GitHub.');
    if (err.status === 422) return jsonError(400, 'invalid_query', 'GitHub could not run that search. Simplify the filters.');
    return jsonError(502, 'github_unavailable', 'GitHub is not responding right now. Try again shortly.');
  }
  console.error(err);
  return jsonError(500, 'internal', 'Something went wrong on our side.');
}

/** Read a JSON body, returning null instead of throwing on malformed input. */
export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export const CACHE_HEADERS = {
  short: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' },
  medium: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
  long: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
} as const;
