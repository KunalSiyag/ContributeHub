import { NextResponse, type NextRequest } from 'next/server';
import { getEnrichedOrganizations } from '@/lib/organizations';
import { CACHE_HEADERS, errorResponse } from '@/lib/api';

/** GET /api/organizations?event=gssoc */
export async function GET(request: NextRequest) {
  const event = request.nextUrl.searchParams.get('event')?.slice(0, 30) || undefined;
  try {
    const { organizations, liveCount, total, repoCount, rateLimited } = await getEnrichedOrganizations({ eventLabel: event });
    return NextResponse.json(
      { organizations, meta: { liveCount, total, repoCount, rateLimited, fetchedAt: new Date().toISOString() } },
      { headers: CACHE_HEADERS.long }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
