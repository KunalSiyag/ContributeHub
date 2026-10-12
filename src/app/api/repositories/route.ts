import { NextResponse, type NextRequest } from 'next/server';
import { buildRepoQuery, searchRepositories } from '@/lib/github';
import { CACHE_HEADERS, errorResponse, intParam, listParam, oneOf } from '@/lib/api';

const SORTS = ['stars', 'updated', 'help-wanted-issues'] as const;

/** GET /api/repositories?query=&language=&topics=a,b&minStars=100&sort=stars&page=1 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const perPage = intParam(params.get('per_page'), { min: 1, max: 30, fallback: 20 });
  // GitHub search serves at most 1,000 results.
  const page = intParam(params.get('page'), { min: 1, max: Math.floor(1000 / perPage), fallback: 1 });
  const sort = oneOf(params.get('sort'), SORTS, 'stars');

  const q = buildRepoQuery({
    text: params.get('query')?.slice(0, 120) || undefined,
    language: params.get('language')?.slice(0, 40) || undefined,
    topics: listParam(params.get('topics'), 5),
    minStars: intParam(params.get('minStars'), { min: 0, max: 1_000_000, fallback: 0 }),
  });

  try {
    const data = await searchRepositories(q, { sort, perPage, page });
    return NextResponse.json(
      { items: data.items, total_count: Math.min(data.total_count, 1000), page, query: q },
      { headers: CACHE_HEADERS.short }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
