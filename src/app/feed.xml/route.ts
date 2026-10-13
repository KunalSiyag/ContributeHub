import { getUpcomingDeadlines, formatDeadlineDate } from '@/lib/events';
import { datesBasis } from '@/lib/program-display';
import { getOfficialSchedules } from '@/lib/programs.server';
import { getSiteUrl } from '@/lib/site';

export const revalidate = 3600;

const SITE_NAME = 'Orion';

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const baseUrl = getSiteUrl();
  const deadlines = getUpcomingDeadlines(90, new Date(), await getOfficialSchedules());

  const items = deadlines
    .map(({ event, deadline }) => {
      const title = `${event.name} — ${deadline.label}: ${formatDeadlineDate(deadline.date)}`;
      const link = `${baseUrl}/events/${event.slug}`;
      const description = `${event.description} ${datesBasis(event).sentence} Confirm on ${event.website}.`;
      // Stable per item: the day this deadline entered the 90-day window.
      const entered = new Date(`${deadline.date}T00:00:00Z`);
      entered.setUTCDate(entered.getUTCDate() - 90);
      const pubDate = new Date(Math.min(entered.getTime(), Date.now())).toUTCString();
      return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(`${link}?d=${deadline.date}`)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(description)}</description>
      <category>${escapeXml(event.shortName)}</category>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)} · Open source program deadlines</title>
    <link>${escapeXml(`${baseUrl}/events`)}</link>
    <description>Application windows and program dates for GSoC, GSSoC, Hacktoberfest, Outreachy, MLH Fellowship, LFX Mentorship and more.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(`${baseUrl}/feed.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
