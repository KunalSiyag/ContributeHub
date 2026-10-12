import 'server-only';
import * as cheerio from 'cheerio';

export interface ContributionDay {
  date: string;
  count: number;
  /** 0–4 intensity bucket, matching GitHub's own levels. */
  level: 0 | 1 | 2 | 3 | 4;
}

export interface ContributionCalendar {
  total: number;
  days: ContributionDay[];
  source: 'graphql' | 'public';
}

function bucket(count: number, max: number): ContributionDay['level'] {
  if (count <= 0) return 0;
  const ratio = count / Math.max(max, 1);
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

async function viaGraphQL(username: string): Promise<ContributionCalendar | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'orion-open-source-hub' },
    body: JSON.stringify({
      query: `query($login: String!) { user(login: $login) { contributionsCollection { contributionCalendar {
        totalContributions weeks { contributionDays { date contributionCount } } } } } }`,
      variables: { login: username },
    }),
    next: { revalidate: 3600 },
  });
  if (!response.ok) return null;
  const json = await response.json();
  const calendar = json?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) return null;
  const raw: Array<{ date: string; contributionCount: number }> = calendar.weeks.flatMap(
    (week: { contributionDays: Array<{ date: string; contributionCount: number }> }) => week.contributionDays
  );
  const max = Math.max(...raw.map(day => day.contributionCount), 1);
  return {
    total: calendar.totalContributions,
    days: raw.map(day => ({ date: day.date, count: day.contributionCount, level: bucket(day.contributionCount, max) })),
    source: 'graphql',
  };
}

/** GitHub's public contributions fragment (the graph on every profile page). */
async function viaPublicPage(username: string): Promise<ContributionCalendar | null> {
  const response = await fetch(`https://github.com/users/${encodeURIComponent(username)}/contributions`, {
    headers: { 'User-Agent': 'orion-open-source-hub', Accept: 'text/html' },
    next: { revalidate: 3600 },
  });
  if (!response.ok) return null;
  const $ = cheerio.load(await response.text());

  const tooltips = new Map<string, number>();
  $('tool-tip').each((_, el) => {
    const id = $(el).attr('for');
    const match = $(el).text().trim().match(/^([\d,]+|No) contribution/);
    if (id && match) tooltips.set(id, match[1] === 'No' ? 0 : Number(match[1].replace(/,/g, '')));
  });

  const days: ContributionDay[] = [];
  $('td.ContributionCalendar-day[data-date]').each((_, el) => {
    const date = $(el).attr('data-date');
    if (!date) return;
    const id = $(el).attr('id') ?? '';
    const level = Number($(el).attr('data-level') ?? 0) as ContributionDay['level'];
    days.push({ date, count: tooltips.get(id) ?? (level > 0 ? 1 : 0), level: Math.min(4, Math.max(0, level)) as ContributionDay['level'] });
  });
  if (days.length === 0) return null;
  days.sort((a, b) => a.date.localeCompare(b.date));

  const heading = $('h2#js-contribution-activity-description, h2.f4.text-normal.mb-2').first().text();
  const totalMatch = heading.replace(/,/g, '').match(/(\d+)/);
  const total = totalMatch ? Number(totalMatch[1]) : days.reduce((sum, day) => sum + day.count, 0);
  return { total, days, source: 'public' };
}

export async function getContributionCalendar(username: string): Promise<ContributionCalendar | null> {
  try {
    return (await viaGraphQL(username)) ?? (await viaPublicPage(username));
  } catch {
    return null;
  }
}
