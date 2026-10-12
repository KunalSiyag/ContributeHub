import { NextResponse, type NextRequest } from 'next/server';
import { countIssues, repoFullName, searchIssues } from '@/lib/github';
import { CACHE_HEADERS, errorResponse, jsonError } from '@/lib/api';

const USERNAME = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

interface SearchItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  repository_url: string;
  comments: number;
  labels?: Array<{ name: string; color: string }>;
  pull_request?: { merged_at?: string | null };
}

function shape(item: SearchItem) {
  return {
    id: item.id,
    number: item.number,
    title: item.title,
    url: item.html_url,
    repo: repoFullName(item.repository_url),
    state: item.pull_request?.merged_at ? ('merged' as const) : item.state,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    comments: item.comments,
  };
}

/** GET /api/github/activity?username=octocat — recent pull requests and PR totals. */
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username') ?? '';
  if (!USERNAME.test(username)) return jsonError(400, 'invalid_username', 'Provide a valid GitHub username.');

  try {
    const [prs, openPRs, mergedPRs] = await Promise.all([
      searchIssues(`is:pr author:${username} archived:false`, { sort: 'updated', perPage: 10, includePullRequests: true }),
      countIssues(`is:pr is:open author:${username}`, 900),
      countIssues(`is:pr is:merged author:${username}`, 1800),
    ]);

    return NextResponse.json(
      {
        prs: (prs.items as unknown as SearchItem[]).map(shape),
        totals: { openPRs, mergedPRs, prs: prs.total_count },
        fetchedAt: new Date().toISOString(),
      },
      { headers: CACHE_HEADERS.short }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
