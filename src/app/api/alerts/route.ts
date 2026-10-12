import { NextResponse } from 'next/server';
import { getMyAlerts } from '@/lib/alerts.server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/alerts — the signed-in member's alerts, each with the number of
 * issues opened since they last looked and the newest five. The sidebar
 * badge and browser notifications poll it.
 */
export async function GET() {
  const { state, alerts } = await getMyAlerts();
  return NextResponse.json(
    { state, alerts },
    { status: state === 'signed-out' ? 401 : 200, headers: { 'Cache-Control': 'private, no-store' } }
  );
}
