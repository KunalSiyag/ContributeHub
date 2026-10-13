import { NextResponse, type NextRequest } from 'next/server';
import { getContributionCalendar } from '@/lib/contributions';
import { CACHE_HEADERS, jsonError } from '@/lib/api';

const USERNAME = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

/** GET /api/github/contributions?username=octocat — last year's contribution calendar. */
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username') ?? '';
  if (!USERNAME.test(username)) return jsonError(400, 'invalid_username', 'Provide a valid GitHub username.');

  const calendar = await getContributionCalendar(username);
  if (!calendar) return jsonError(502, 'unavailable', 'The contribution calendar is not available right now.');
  return NextResponse.json(calendar, { headers: CACHE_HEADERS.long });
}
