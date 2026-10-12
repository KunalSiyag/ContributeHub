import { NextResponse, type NextRequest } from 'next/server';
import { buildIssueQuery, ISSUE_PRESETS, ISSUE_SORTS, searchIssues } from '@/lib/github';
import { CACHE_HEADERS, errorResponse, intParam, listParam, oneOf } from '@/lib/api';

/** GET /api/issues?preset=good-first&language=Go&labels=docs&query=parser&sort=created&page=1 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const preset = oneOf(params.get('preset'), ISSUE_PRESETS, 'good-first');
  const sort = oneOf(params.get('sort'), ISSUE_SORTS, 'created');
  const perPage = intParam(params.get('per_page'), { min: 1, max: 50, fallback: 20 });
  // GitHub search serves at most 1,000 results.
  const page = intParam(params.get('page'), { min: 1, max: Math.floor(1000 / perPage), fallback: 1 });

  const q = buildIssueQuery({
    preset,
    language: params.get('language')?.slice(0, 40) || undefined,
    labels: listParam(params.get('labels'), 5),
    text: params.get('query')?.slice(0, 120) || undefined,
    minStars: intParam(params.get('minStars'), { min: 0, max: 1_000_000, fallback: 0 }),
  });

  try {
    const data = await searchIssues(q, { sort, perPage, page });
    return NextResponse.json(
      // GitHub only serves the first 1,000 search results.
      { items: data.items, total_count: Math.min(data.total_count, 1000), page, query: q },
      { headers: CACHE_HEADERS.short }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
