import 'server-only';
import type { Issue } from '@/types';
import { repoFullName } from './github';

export const escapeXml = (input: string) =>
  input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

interface IssueFeed {
  baseUrl: string;
  title: string;
  description: string;
  /** The page the feed belongs to. */
  link: string;
  /** This feed's own URL. */
  self: string;
  issues: Issue[];
  /** One issue a day: the item's date and id follow the day, not the issue. */
  day?: string;
}

/** RSS 2.0 for a list of GitHub issues, each linking to GitHub and to Orion. */
export function issueFeedXml({ baseUrl, title, description, link, self, issues, day }: IssueFeed): string {
  const items = issues
    .map(issue => {
      const repo = repoFullName(issue.repository_url);
      const labels = (issue.labels ?? []).map(label => label.name);
      return `    <item>
      <title>${escapeXml(`${repo}#${issue.number}: ${issue.title}`)}</title>
      <link>${escapeXml(issue.html_url)}</link>
      <guid isPermaLink="${day ? 'false' : 'true'}">${escapeXml(day ? `${issue.html_url}#${day}` : issue.html_url)}</guid>
      <pubDate>${new Date(day ? `${day}T00:00:00Z` : issue.created_at).toUTCString()}</pubDate>
      <description>${escapeXml(`${repo}${labels.length ? ` · ${labels.join(', ')}` : ''}. Open in Orion: ${baseUrl}/issues/${repo}/${issue.number}`)}</description>
      ${labels.map(label => `<category>${escapeXml(label)}</category>`).join('')}
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(link)}</link>
    <description>${escapeXml(description)}</description>
    <language>en</language>
    <atom:link href="${escapeXml(self)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}

export const FEED_HEADERS = {
  'Content-Type': 'application/rss+xml; charset=utf-8',
  'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
};
