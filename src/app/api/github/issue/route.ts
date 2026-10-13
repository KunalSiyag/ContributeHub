import { NextResponse, type NextRequest } from 'next/server';
import { getIssue, repoFullName } from '@/lib/github';
import { CACHE_HEADERS, errorResponse, jsonError } from '@/lib/api';

const ISSUE_URL = /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/(issues|pull)\/(\d{1,9})(?:[/?#].*)?$/;

/** GET /api/github/issue?url=https://github.com/owner/repo/issues/123 — minimal issue facts for tracking. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')?.trim() ?? '';
  const match = url.match(ISSUE_URL);
  if (!match) return jsonError(400, 'invalid_url', 'Paste a GitHub issue link like https://github.com/owner/repo/issues/123.');
  if (match[3] === 'pull') return jsonError(400, 'pull_request', 'That is a pull request. Orion tracks issues.');

  try {
    const issue = await getIssue(match[1], match[2], Number(match[4]));
    if (issue.pull_request) return jsonError(400, 'pull_request', 'That is a pull request. Orion tracks issues.');
    return NextResponse.json(
      {
        url: issue.html_url,
        number: issue.number,
        repo: repoFullName(issue.html_url),
        title: issue.title,
        state: issue.state,
        labels: (issue.labels ?? []).map(label => label.name),
        description: (issue.body ?? '').slice(0, 2000),
      },
      { headers: CACHE_HEADERS.short }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
