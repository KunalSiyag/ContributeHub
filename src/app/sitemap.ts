import type { MetadataRoute } from 'next';
import { getAllEvents } from '@/lib/events';
import { getSiteUrl } from '@/lib/site';

// Program editions roll over during the year; rebuild the list daily.
export const revalidate = 86400;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();
  const pages: Array<[string, MetadataRoute.Sitemap[number]['changeFrequency'], number]> = [
    ['/', 'daily', 1],
    ['/discover', 'hourly', 0.9],
    ['/trending', 'hourly', 0.8],
    ['/repos', 'weekly', 0.6],
    ['/starter', 'daily', 0.8],
    ['/collections', 'weekly', 0.7],
    ['/companies', 'weekly', 0.6],
    ['/community', 'daily', 0.6],
    ['/leaderboard', 'daily', 0.5],
    ['/repo-bot', 'monthly', 0.5],
    ['/support', 'monthly', 0.3],
    ['/perks', 'daily', 0.5],
    ['/events', 'daily', 0.9],
    ['/bounties', 'hourly', 0.8],
    ['/resources', 'weekly', 0.7],
    ['/resume', 'monthly', 0.5],
  ];

  return [
    ...pages.map(([path, changeFrequency, priority]) => ({ url: `${base}${path}`, lastModified: now, changeFrequency, priority })),
    ...getAllEvents(now).map(event => ({
      url: `${base}/events/${event.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
