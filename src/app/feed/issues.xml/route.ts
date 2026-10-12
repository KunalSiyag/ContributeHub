import type { NextRequest } from 'next/server';
import type { Issue } from '@/types';
import { searchIssues } from '@/lib/github';
import { FEED_HEADERS, issueFeedXml } from '@/lib/issue-feed';
import { getSiteUrl } from '@/lib/site';
import { dailyPick, readWatchlistParams, watchlistQuery, watchlistSearch } from '@/lib/watchlist';

/**
 * GET /feed/issues.xml?repos=a/b,c/d&labels=good first issue&unassigned=1 —
 * new issues in chosen repositories as RSS, so any feed reader (or a Slack
 * or Discord RSS app) can alert on them.
 */
export async function GET(request: NextRequest) {
  const params = readWatchlistParams(request.nextUrl.searchParams);
  // daily=1: one issue a day instead of every new one (like CodeTriage's daily email).
  const daily = request.nextUrl.searchParams.get('daily') === '1';
  if (params.repos.length === 0) {
    return new Response('Add ?repos=owner/name,owner/name to choose repositories.', { status: 400 });
  }

  const baseUrl = getSiteUrl();
  const today = new Date().toISOString().slice(0, 10);
  let issues: Issue[] = [];
  try {
    const { items: found } = await searchIssues(watchlistQuery(params), { sort: 'created', perPage: 30, revalidate: 600 });
    const pick = daily ? dailyPick(found, today) : undefined;
    issues = daily ? (pick ? [pick] : []) : found;
  } catch {
    // An empty feed beats an error: readers retry on their own schedule.
  }

  const where = params.repos.length === 1 ? params.repos[0] : `${params.repos.length} repositories`;
  const xml = issueFeedXml({
    baseUrl,
    title: daily ? `Orion · Issue of the day from ${where}` : `Orion · New issues in ${where}`,
    description: `Open issues${params.labels.length ? ` labelled ${params.labels.join(', ')}` : ''} in ${params.repos.join(', ')}.`,
    link: `${baseUrl}/issues?tab=repos`,
    self: `${baseUrl}/feed/issues.xml?${watchlistSearch(params)}${daily ? '&daily=1' : ''}`,
    issues,
    day: daily ? today : undefined,
  });
  return new Response(xml, { headers: FEED_HEADERS });
}
