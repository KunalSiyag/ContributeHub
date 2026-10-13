import { NextResponse, type NextRequest } from 'next/server';
import { searchIssues } from '@/lib/github';
import { CACHE_HEADERS, errorResponse, jsonError } from '@/lib/api';
import { readWatchlistParams, watchlistQuery } from '@/lib/watchlist';

/** GET /api/issues/watchlist?repos=a/b,c/d&labels=&unassigned=1 — newest open issues across repositories. */
export async function GET(request: NextRequest) {
  const params = readWatchlistParams(request.nextUrl.searchParams);
  if (params.repos.length === 0) return jsonError(400, 'invalid_repos', 'Pass one or more repositories as owner/name.');
  try {
    const q = watchlistQuery(params);
    const data = await searchIssues(q, { sort: 'created', perPage: 20, revalidate: 600 });
    return NextResponse.json({ items: data.items, total_count: data.total_count, query: q }, { headers: CACHE_HEADERS.short });
  } catch (err) {
    return errorResponse(err);
  }
}
