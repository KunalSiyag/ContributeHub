import 'server-only';
import type { EventDeadline } from '@/types';
import type { OfficialSchedule } from './events';

/**
 * Outreachy has no API, but its applicant guide publishes the current round
 * as a small table ("December 2026 Outreachy internship cohort round
 * schedule"). We read that table; if the page changes shape, the calendar
 * rules stay in place.
 */
export const OUTREACHY_SCHEDULE_URL = 'https://www.outreachy.org/docs/applicant/';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** "Aug. 24, 2026", "March 8, 2027" → ISO dates, in order of appearance. */
function datesIn(value: string): string[] {
  return [...value.matchAll(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),\s*(\d{4})/g)]
    .map(([, month, day, year]) => {
      const m = MONTHS.indexOf(month.slice(0, 3).toLowerCase());
      if (m < 0) return null;
      return new Date(Date.UTC(Number(year), m, Number(day))).toISOString().slice(0, 10);
    })
    .filter((d): d is string => d !== null);
}

const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

export interface OutreachyRound {
  year: number;
  /** Template cohort label. */
  cohort: 'May Cohort' | 'December Cohort';
  schedule: OfficialSchedule;
}

export function parseOutreachySchedule(html: string): OutreachyRound | null {
  const heading = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\s+Outreachy internship cohort round schedule/i.exec(
    html
  );
  if (!heading) return null;
  const month = heading[1].toLowerCase();
  const cohort = month === 'may' ? 'May Cohort' : month === 'december' ? 'December Cohort' : null;
  if (!cohort) return null;

  const table = /<table[^>]*>([\s\S]*?)<\/table>/i.exec(html.slice(heading.index));
  if (!table) return null;

  let applicationStart: string | undefined;
  let applicationDeadline: string | undefined;
  let internship: string[] = [];
  const milestones: EventDeadline[] = [];
  for (const [, row] of table[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(([, cell]) => plain(cell));
    if (cells.length < 2) continue;
    const [when, what] = cells;
    const dates = datesIn(when);
    if (dates.length === 0) continue;
    const label = what.toLowerCase();
    if (label.includes('initial applications open')) applicationStart = dates[0];
    else if (label.includes('initial application deadline')) applicationDeadline = dates[0];
    else if (label.includes('internship')) internship = dates;
    else if (label.includes('contribut')) milestones.push({ label: 'Contribution period opens', date: dates[0] });
    else milestones.push({ label: what.charAt(0).toUpperCase() + what.slice(1), date: dates[0] });
  }
  if (internship.length < 2 || internship[0] > internship[1]) return null;

  return {
    year: Number(internship[0].slice(0, 4)),
    cohort,
    schedule: {
      cohort,
      applicationStart,
      applicationDeadline,
      contributionStart: internship[0],
      contributionEnd: internship[1],
      source: `${OUTREACHY_SCHEDULE_URL}#outreachy-schedule`,
      milestones,
    },
  };
}

/** The round Outreachy currently publishes, or null when the page is unreachable or unrecognised. */
export async function getOutreachyRound(): Promise<OutreachyRound | null> {
  try {
    const response = await fetch(OUTREACHY_SCHEDULE_URL, {
      next: { revalidate: 43200 },
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Orion program calendar' },
    });
    return response.ok ? parseOutreachySchedule(await response.text()) : null;
  } catch {
    return null;
  }
}
