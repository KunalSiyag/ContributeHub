import 'server-only';

/*
 * Community writing about open source from DEV (dev.to's public API, no key),
 * the week's most-liked posts tagged #opensource. Refreshed every six hours;
 * an outage simply hides the section.
 */

export const ARTICLES_SOURCE = 'https://dev.to/t/opensource';

export interface CommunityArticle {
  title: string;
  url: string;
  author: string;
  minutes: number;
  published: string;
  reactions: number;
  comments: number;
}

export function parseArticles(raw: unknown): CommunityArticle[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): CommunityArticle | null => {
      const item = entry as Record<string, unknown>;
      const user = (item.user ?? {}) as Record<string, unknown>;
      const url = typeof item.url === 'string' && item.url.startsWith('https://dev.to/') ? item.url : null;
      const title = typeof item.title === 'string' ? item.title.trim() : '';
      if (!url || !title) return null;
      return {
        title,
        url,
        author: typeof user.name === 'string' && user.name.trim() ? user.name.trim() : String(user.username ?? 'DEV author'),
        minutes: typeof item.reading_time_minutes === 'number' ? item.reading_time_minutes : 1,
        published: typeof item.published_at === 'string' ? item.published_at : new Date().toISOString(),
        reactions: typeof item.positive_reactions_count === 'number' ? item.positive_reactions_count : 0,
        comments: typeof item.comments_count === 'number' ? item.comments_count : 0,
      };
    })
    .filter((article): article is CommunityArticle => article !== null);
}

export async function getCommunityArticles(count = 6): Promise<CommunityArticle[]> {
  try {
    const response = await fetch(`https://dev.to/api/articles?tag=opensource&top=7&per_page=${count}`, {
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    });
    return response.ok ? parseArticles(await response.json()) : [];
  } catch {
    return [];
  }
}
