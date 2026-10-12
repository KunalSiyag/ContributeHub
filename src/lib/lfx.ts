import 'server-only';
import type { OfficialSchedule } from './events';

/**
 * LFX Mentorship's public project index — the same search the mentorship site
 * runs. Open projects carry their terms with real application and work dates,
 * so they give both the live mentorship list and the official term schedule.
 */
const API = 'https://api.mentorship.lfx.linuxfoundation.org/projects/cache/paginate';
export const LFX_SITE = 'https://mentorship.lfx.linuxfoundation.org';

export interface LfxTerm {
  name: string;
  applicationStart?: string;
  applicationEnd?: string;
  start: string;
  end: string;
}

export interface LfxProject {
  id: string;
  name: string;
  /** The Linux Foundation project it belongs to, e.g. "Cloud Native Computing Foundation (CNCF)". */
  foundation: string;
  logo: string | null;
  skills: string[];
  repo: string | null;
  applications: number;
  accepting: boolean;
  terms: LfxTerm[];
  url: string;
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const httpUrl = (value: unknown) => (typeof value === 'string' && /^https:\/\//.test(value.trim()) ? value.trim() : null);
/** LFX dates are Unix seconds. */
const day = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? new Date(value * 1000).toISOString().slice(0, 10) : undefined;

export function parseLfxProjects(raw: unknown): LfxProject[] {
  const hits = (raw as { hits?: { hits?: unknown } } | null)?.hits?.hits;
  if (!Array.isArray(hits)) return [];
  return hits
    .map((hit): LfxProject | null => {
      const p = ((hit as { _source?: unknown })._source ?? {}) as Record<string, unknown>;
      const id = text(p.projectId);
      const name = text(p.name);
      if (!id || !name || text(p.status) !== 'Published') return null;
      const needs = (p.apprenticeNeeds ?? {}) as Record<string, unknown>;
      const terms = (Array.isArray(p.programTerms) ? p.programTerms : [])
        .map((t): LfxTerm | null => {
          const term = t as Record<string, unknown>;
          const start = day(term.startDateTime);
          const end = day(term.endDateTime);
          if (text(term.active) !== 'open' || !start || !end || start > end) return null;
          return {
            name: text(term.name),
            applicationStart: day(term.applicationStartDate),
            applicationEnd: day(term.applicationEndDate),
            start,
            end,
          };
        })
        .filter((t): t is LfxTerm => t !== null);
      return {
        id,
        name,
        foundation: text(p.lfProjectName),
        logo: httpUrl(p.logoUrl) ?? httpUrl(p.lfProjectLogo),
        skills: (Array.isArray(needs.skills) ? needs.skills : []).filter((s): s is string => typeof s === 'string').slice(0, 8),
        repo: httpUrl(p.repoLink)?.startsWith('https://github.com/') ? httpUrl(p.repoLink) : null,
        applications: typeof p.applicationsCount === 'number' ? p.applicationsCount : 0,
        accepting: p.acceptApplications === true,
        terms,
        url: `${LFX_SITE}/project/${id}`,
      };
    })
    .filter((p): p is LfxProject => p !== null);
}

/** Pages of 100 stay under the 2 MB limit of Next.js's data cache (each project carries its description). */
const PAGE = 100;
const MAX_PAGES = 6;

async function page(from: number): Promise<unknown> {
  const response = await fetch(`${API}?from=${from}&size=${PAGE}&sortby=updatedStamp&order=desc&status=open`, {
    next: { revalidate: 21600 },
    signal: AbortSignal.timeout(10000),
  });
  return response.ok ? response.json() : null;
}

/** Open mentorships, newest activity first. Empty when the index is unreachable. */
export async function getLfxProjects(): Promise<LfxProject[]> {
  try {
    const first = (await page(0)) as { hits?: { total?: { value?: number } } } | null;
    if (!first) return [];
    const total = Math.min(first.hits?.total?.value ?? 0, PAGE * MAX_PAGES);
    const rest = await Promise.all(
      Array.from({ length: Math.max(0, Math.ceil(total / PAGE) - 1) }, (_, i) => page((i + 1) * PAGE).catch(() => null))
    );
    return [first, ...rest].flatMap(raw => parseLfxProjects(raw));
  } catch {
    return [];
  }
}

/** "2026 Term 3 (Sep-Nov)" → the template cohort it replaces. */
const TERM_COHORT: Record<string, string> = { '1': 'Spring Term', '2': 'Summer Term', '3': 'Fall Term' };

/**
 * Official term dates from the open projects. Projects copy their term's
 * dates, so the most common set per term wins and stray edits don't count.
 * Application dates are dropped when they don't fit before the term.
 */
export function lfxSchedules(projects: LfxProject[]): Record<number, OfficialSchedule[]> {
  const votes = new Map<string, Map<string, number>>();
  for (const project of projects) {
    for (const term of project.terms) {
      const match = /(\d{4})\s*Term\s*([123])\b/i.exec(term.name);
      if (!match) continue;
      const key = `${match[1]}|${match[2]}`;
      const dates = JSON.stringify([term.applicationStart ?? '', term.applicationEnd ?? '', term.start, term.end]);
      const tally = votes.get(key) ?? new Map<string, number>();
      tally.set(dates, (tally.get(dates) ?? 0) + 1);
      votes.set(key, tally);
    }
  }

  const schedules: Record<number, OfficialSchedule[]> = {};
  for (const [key, tally] of votes) {
    const [year, term] = key.split('|');
    const [best] = [...tally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const [applicationStart, applicationEnd, start, end] = JSON.parse(best[0]) as string[];
    const windowFits = applicationStart && applicationEnd && applicationStart <= applicationEnd && applicationEnd <= start;
    (schedules[Number(year)] ??= []).push({
      cohort: TERM_COHORT[term],
      applicationStart: windowFits ? applicationStart : undefined,
      applicationDeadline: windowFits ? applicationEnd : undefined,
      contributionStart: start,
      contributionEnd: end,
      source: LFX_SITE,
    });
  }
  return schedules;
}

/** Open projects that belong to one term of an edition, most contested first. */
export function projectsForTerm(projects: LfxProject[], year: number, cohort?: string): LfxProject[] {
  const term = Object.entries(TERM_COHORT).find(([, label]) => label === cohort)?.[0];
  if (!term) return [];
  const pattern = new RegExp(`${year}\\s*Term\\s*${term}\\b`, 'i');
  return projects
    .filter(project => project.terms.some(t => pattern.test(t.name)))
    .sort((a, b) => Number(b.accepting) - Number(a.accepting) || b.applications - a.applications);
}

/** How many open projects each foundation runs, largest first. */
export function foundationCounts(projects: LfxProject[]): Array<[foundation: string, count: number]> {
  const counts = new Map<string, number>();
  for (const project of projects) {
    if (project.foundation) counts.set(project.foundation, (counts.get(project.foundation) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
