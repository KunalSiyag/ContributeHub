import { NextResponse, type NextRequest } from 'next/server';
import { BOUNTY_SOURCES } from '@/lib/bounties';
import { fetchBounties } from '@/lib/bounties.server';
import { CACHE_HEADERS, errorResponse, intParam, oneOf } from '@/lib/api';

/** GET /api/bounties?source=all|github|algora&language=TypeScript&limit=60 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawSource = params.get('source');
  if (rawSource && !BOUNTY_SOURCES.includes(rawSource as never)) {
    return NextResponse.json({ error: 'invalid_source', message: 'source must be all, github or algora.' }, { status: 400 });
  }

  try {
    const result = await fetchBounties({
      source: oneOf(rawSource, BOUNTY_SOURCES, 'all'),
      language: params.get('language')?.slice(0, 40) || undefined,
      limit: intParam(params.get('limit'), { min: 1, max: 80, fallback: 60 }),
    });
    return NextResponse.json(
      { bounties: result.bounties, count: result.bounties.length, partial: result.partial },
      { headers: CACHE_HEADERS.medium }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
