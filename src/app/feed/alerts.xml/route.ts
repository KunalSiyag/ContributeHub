import type { NextRequest } from 'next/server';
import type { Issue } from '@/types';
import { alertSearchParams, alertSearchQuery, defaultAlertName, readAlertSearchParams } from '@/lib/alerts';
import { searchIssues } from '@/lib/github';
import { FEED_HEADERS, issueFeedXml } from '@/lib/issue-feed';
import { getSiteUrl } from '@/lib/site';

/**
 * GET /feed/alerts.xml?preset=good-first&language=Rust&labels=…&repos=…&q=…&stars=…
 * — an alert's search as RSS: the newest matching issues, so a feed reader,
 * an RSS-to-email service or a Slack RSS app can deliver the alert anywhere.
 * The search lives in the URL, so the feed needs no account.
 */
export async function GET(request: NextRequest) {
  const query = readAlertSearchParams(request.nextUrl.searchParams);
  if (!query) {
    return new Response('Describe the alert with ?preset=, language=, labels=, repos=, q= or stars= (see /alerts).', { status: 400 });
  }

  const baseUrl = getSiteUrl();
  let issues: Issue[] = [];
  try {
    issues = (await searchIssues(alertSearchQuery(query), { sort: 'created', perPage: 30, revalidate: 600 })).items;
  } catch {
    // An empty feed beats an error: readers retry on their own schedule.
  }

  const xml = issueFeedXml({
    baseUrl,
    title: `Orion alert · ${defaultAlertName(query)}`,
    description: `New open issues matching: ${alertSearchQuery(query)}`,
    link: `${baseUrl}/alerts`,
    self: `${baseUrl}/feed/alerts.xml?${alertSearchParams(query)}`,
    issues,
  });
  return new Response(xml, { headers: FEED_HEADERS });
}
