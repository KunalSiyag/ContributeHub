import { NextResponse } from 'next/server';
import { emailConfig, runAlertDigest, sameSecret } from '@/lib/alert-digest.server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/alert-digest — sends the daily alert emails. Vercel Cron
 * calls it (vercel.json) with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const config = emailConfig();
  if (!config) return NextResponse.json({ error: 'Email alerts are not set up on this site.' }, { status: 503 });
  if (!sameSecret(request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null, config.secret)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  try {
    return NextResponse.json(await runAlertDigest());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The digest failed.' }, { status: 500 });
  }
}
