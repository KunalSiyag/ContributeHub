import 'server-only';
import type { EventDeadline } from '@/types';
import type { OfficialSchedule } from './events';

/**
 * Programs without an API that still publish their dates on their own site:
 * Social Winter of Code (a "Key dates" block on swoc.in), GirlScript Summer
 * of Code (a milestone timeline on gssoc.girlscript.tech) and the MLH
 * Fellowship (the terms on its application form). Each parser returns null
 * when the page changes shape, so the calendar rules take over.
 */

export const SWOC_SITE = 'https://swoc.in';
export const GSSOC_SITE = 'https://gssoc.girlscript.tech';
export const MLH_APPLY = 'https://fellowship.mlh.io/apply';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const iso = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
const monthIndex = (name: string) => MONTHS.indexOf(name.slice(0, 3).toLowerCase());

const plain = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;|&rsquo;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** "20 Aug 2026" or "24th March 2026" → ISO day. */
function dayMonthYear(value: string): string | null {
  const match = /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/.exec(value);
  if (!match) return null;
  const month = monthIndex(match[2]);
  return month < 0 ? null : iso(Number(match[3]), month, Number(match[1]));
}

export interface SiteSchedule {
  /** Edition year: the year the contribution period starts. */
  year: number;
  schedule: OfficialSchedule;
}

/** swoc.in: <h4>20 Aug 2026</h4><p>Registrations open</p> … inside the "Key dates" section. */
export function parseSwocDates(html: string): SiteSchedule | null {
  const section = /id=["']dates["'][\s\S]*?<\/section>/i.exec(html)?.[0];
  if (!section) return null;
  let applicationStart: string | undefined;
  let applicationDeadline: string | undefined;
  let start: string | undefined;
  let end: string | undefined;
  const milestones: EventDeadline[] = [];
  for (const [, when, what] of section.matchAll(/<h4[^>]*>([\s\S]*?)<\/h4>\s*<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const date = dayMonthYear(plain(when));
    const label = plain(what);
    if (!date || !label) continue;
    if (/registrations?\s+open/i.test(label)) applicationStart = date;
    else if (/registrations?\s+close/i.test(label)) applicationDeadline = date;
    else if (/program(me)?\s+(starts|begins)/i.test(label)) start = date;
    else if (/program(me)?\s+ends/i.test(label)) end = date;
    else milestones.push({ label, date });
  }
  if (!start || !end || start > end) return null;
  return {
    year: Number(start.slice(0, 4)),
    schedule: {
      applicationStart,
      applicationDeadline,
      contributionStart: start,
      contributionEnd: end,
      source: `${SWOC_SITE}/#dates`,
      ...(milestones.length > 0 && { milestones }),
    },
  };
}

/**
 * gssoc.girlscript.tech: "Key milestones for GirlScript Summer of Code 2026
 * 01 24th March 2026 Launch Event + Applications Open … 04 May to June 2026
 * Contribution Period …". Exact days are used as they are; a month range
 * ("May to June 2026") spans from the first of one month to the last of the other.
 */
export function parseGssocMilestones(html: string): SiteSchedule | null {
  const text = plain(html);
  const heading = /Key milestones for GirlScript Summer of Code (\d{4})/i.exec(text);
  if (!heading) return null;
  const year = Number(heading[1]);
  const block = text.slice(heading.index + heading[0].length, heading.index + heading[0].length + 2500);
  // Items are numbered 01, 02, …
  const items = block.split(/\s0\d\s/).map(item => item.trim()).filter(Boolean);

  let applicationStart: string | undefined;
  let start: string | undefined;
  let end: string | undefined;
  for (const item of items) {
    if (/applications?\s+open/i.test(item)) applicationStart = dayMonthYear(item) ?? applicationStart;
    if (/contribution period/i.test(item)) {
      const range = /([A-Za-z]{3,9})\s+to\s+([A-Za-z]{3,9})\s+(\d{4})/.exec(item);
      if (range && monthIndex(range[1]) >= 0 && monthIndex(range[2]) >= 0) {
        const y = Number(range[3]);
        start = iso(y, monthIndex(range[1]), 1);
        end = iso(y, monthIndex(range[2]) + 1, 0);
      }
    }
  }
  if (!start || !end || start > end) return null;
  return {
    year,
    schedule: {
      applicationStart: applicationStart && applicationStart <= start ? applicationStart : undefined,
      contributionStart: start,
      contributionEnd: end,
      source: GSSOC_SITE,
    },
  };
}

const MLH_COHORTS: Record<string, string> = { spring: 'Spring Cohort', summer: 'Summer Cohort', fall: 'Fall Cohort' };

/** "September", "14", 2026 → ISO day. */
function monthDay(month: string, day: string, year: number): string | null {
  const m = monthIndex(month);
  return m < 0 ? null : iso(year, m, Number(day));
}

/**
 * fellowship.mlh.io/apply (an application form). Each upcoming term is a
 * choice such as "Fall 2026 (September 14 - December 4, 2026)", and "Upcoming
 * Terms and Deadlines" adds "Fall 2026 Software Engineering: Starts September
 * 14th, 2026 Deadline for Applicants from all regions: August 31, 2026". Tracks
 * that share a term share its dates. Schedules by edition year, one per cohort.
 */
export function parseMlhTerms(html: string): Record<number, OfficialSchedule[]> | null {
  const text = plain(html);
  const terms = new Map<string, OfficialSchedule & { year: number }>();
  for (const [, season, year, startMonth, startDay, endMonth, endDay, endYear] of text.matchAll(
    /\b(Spring|Summer|Fall) (\d{4}) \(([A-Za-z]{3,9}) (\d{1,2}) - ([A-Za-z]{3,9}) (\d{1,2}), (\d{4})\)/g
  )) {
    const end = monthDay(endMonth, endDay, Number(endYear));
    // A term that starts in a later month than it ends began the year before.
    const sameYear = monthDay(startMonth, startDay, Number(endYear));
    const start = sameYear && end && sameYear > end ? monthDay(startMonth, startDay, Number(endYear) - 1) : sameYear;
    if (!start || !end) continue;
    terms.set(`${season} ${year}`, {
      year: Number(year),
      cohort: MLH_COHORTS[season.toLowerCase()],
      contributionStart: start,
      contributionEnd: end,
      source: MLH_APPLY,
    });
  }
  if (terms.size === 0) return null;

  const deadlines = /Upcoming Terms and Deadlines([\s\S]{0,2000}?)(?:The application takes|Eligibility Check|$)/i.exec(text)?.[1] ?? '';
  // split() keeps the captured season and year: [before, season, year, details, season, year, details, …]
  const parts = deadlines.split(/\b(Spring|Summer|Fall) (\d{4})\b/);
  for (let i = 1; i + 1 < parts.length; i += 3) {
    const term = terms.get(`${parts[i]} ${parts[i + 1]}`);
    if (!term) continue;
    const found = [...(parts[i + 2] ?? '').matchAll(/Deadline for Applicants?\s*(?:from\s+)?([^:]{1,60}):\s*([A-Za-z]{3,9})\.? (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})/gi)]
      .map(([, who, month, day, year]) => ({ who: who.trim(), date: monthDay(month, day, Number(year)) }))
      .filter((d): d is { who: string; date: string } => d.date !== null && d.date <= term.contributionStart);
    if (found.length === 0) continue;
    term.applicationDeadline = found.reduce((latest, d) => (d.date > latest ? d.date : latest), found[0].date);
    if (found.length > 1) term.milestones = found.map(d => ({ label: `Applications close (${d.who})`, date: d.date }));
  }

  const byYear: Record<number, OfficialSchedule[]> = {};
  for (const { year, ...schedule } of terms.values()) (byYear[year] ??= []).push(schedule);
  return byYear;
}

async function page(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      next: { revalidate: 43200 },
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Orion program calendar' },
    });
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

export async function getSwocSchedule(): Promise<SiteSchedule | null> {
  const html = await page(SWOC_SITE);
  return html ? parseSwocDates(html) : null;
}

export async function getGssocSchedule(): Promise<SiteSchedule | null> {
  const html = await page(GSSOC_SITE);
  return html ? parseGssocMilestones(html) : null;
}

export async function getMlhSchedules(): Promise<Record<number, OfficialSchedule[]> | null> {
  const html = await page(MLH_APPLY);
  return html ? parseMlhTerms(html) : null;
}
