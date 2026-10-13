import type { ContributionEvent, EventPhase } from '@/types';
import { getCohortLabel } from '@/lib/events';

/** Display order for program lists: what you can act on first. */
const PHASE_RANK: Record<EventPhase, number> = {
  'applications-open': 0,
  running: 1,
  'applications-closed': 2,
  'pre-announcement': 3,
  ended: 4,
};

/** Applications open, running, closed, opening soon, ended; ties by next deadline. */
export function sortPrograms(events: ContributionEvent[]): ContributionEvent[] {
  return [...events].sort(
    (a, b) =>
      PHASE_RANK[a.phase ?? 'pre-announcement'] - PHASE_RANK[b.phase ?? 'pre-announcement'] ||
      (a.nextDeadline?.date ?? '9999').localeCompare(b.nextDeadline?.date ?? '9999') ||
      a.name.localeCompare(b.name)
  );
}

/** "MLH Fellowship 2026 Fall Cohort"; plain name for single-cohort programs. */
export function editionTitle(event: ContributionEvent): string {
  const cohort = getCohortLabel(event);
  return cohort ? `${event.name} ${cohort}` : event.name;
}

/** "GSoC 2027" or "MLH 2026 Fall Cohort". */
export function editionShortTitle(event: ContributionEvent): string {
  const cohort = getCohortLabel(event);
  return [event.shortName, event.editionYear, cohort].filter(Boolean).join(' ');
}

function parts(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Mar 24" */
export function formatMonthDay(dateStr: string): string {
  const { month, day } = parts(dateStr);
  return `${MONTHS[month - 1]} ${day}`;
}

/** "Mar 24 – Apr 8, 2027", or "Dec 1, 2026 – Mar 14, 2027" across years. */
export function formatDateRange(start: string, end: string, separator = ' – '): string {
  const a = parts(start);
  const b = parts(end);
  const head = a.year === b.year ? formatMonthDay(start) : `${formatMonthDay(start)}, ${a.year}`;
  return `${head}${separator}${formatMonthDay(end)}, ${b.year}`;
}

/** "summerofcode.withgoogle.com" */
export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Typographic dash for ranges in template copy ("$750 - $6,600" → "$750–$6,600"). */
export function formatStipend(event: ContributionEvent): string {
  if (!event.isPaid) return 'Unpaid';
  return event.stipendNote ? event.stipendNote.replace(/(\d)\s+-\s+(\$?\d)/g, '$1–$2') : 'Paid';
}

/** ISO date (UTC) for the start of `now`'s day. */
export function todayISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
