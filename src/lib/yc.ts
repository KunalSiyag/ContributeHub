import 'server-only';

/**
 * Y Combinator companies tagged "Open Source", from the community yc-oss API
 * (a daily snapshot of YC's public company directory). Contributors use it
 * to find companies whose product is open source, and which of them hire.
 */
const API = 'https://yc-oss.github.io/api/tags/open-source.json';
export const YC_SOURCE = 'https://github.com/yc-oss/api';

export interface YcCompany {
  slug: string;
  name: string;
  oneLiner: string;
  website: string | null;
  logo: string | null;
  batch: string;
  status: string;
  hiring: boolean;
  teamSize: number | null;
  industries: string[];
  location: string;
  /** Company page on ycombinator.com. */
  url: string;
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const httpUrl = (value: unknown) => (typeof value === 'string' && /^https?:\/\//.test(value) ? value : null);

export function parseYcCompanies(raw: unknown): YcCompany[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): YcCompany | null => {
      const c = entry as Record<string, unknown>;
      const slug = text(c.slug);
      const name = text(c.name);
      if (!slug || !name) return null;
      return {
        slug,
        name,
        oneLiner: text(c.one_liner),
        website: httpUrl(c.website),
        logo: httpUrl(c.small_logo_thumb_url),
        batch: text(c.batch),
        status: text(c.status) || 'Active',
        hiring: c.isHiring === true,
        teamSize: typeof c.team_size === 'number' ? c.team_size : null,
        industries: (Array.isArray(c.industries) ? c.industries : []).filter((i): i is string => typeof i === 'string'),
        location: text(c.all_locations),
        url: httpUrl(c.url) ?? `https://www.ycombinator.com/companies/${slug}`,
      };
    })
    .filter((c): c is YcCompany => c !== null);
}

/** Batches sort newest first: "Winter 2026" > "Summer 2025" > "W24" … */
export function batchOrder(batch: string): number {
  const long = /(Winter|Spring|Summer|Fall)\s+(\d{4})/i.exec(batch);
  if (long) return Number(long[2]) * 10 + ['winter', 'spring', 'summer', 'fall'].indexOf(long[1].toLowerCase());
  const short = /^([WSFX])(\d{2})$/i.exec(batch);
  if (short) return (2000 + Number(short[2])) * 10 + ({ w: 0, x: 1, s: 2, f: 3 } as Record<string, number>)[short[1].toLowerCase()];
  return 0;
}

export async function getYcOpenSource(): Promise<YcCompany[]> {
  try {
    const response = await fetch(API, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return [];
    return parseYcCompanies(await response.json()).sort((a, b) => batchOrder(b.batch) - batchOrder(a.batch) || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}
