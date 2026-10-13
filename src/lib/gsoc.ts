import 'server-only';

/**
 * Google Summer of Code's public program data — the same JSON
 * summerofcode.withgoogle.com renders from. Official dates and the accepted
 * organization list replace Orion's calendar rules whenever it answers.
 */
const API = 'https://summerofcode.withgoogle.com/api/program';
/** Editions before the current site (2016–2021, and copies of later ones). */
const ARCHIVE = 'https://summerofcode.withgoogle.com/api/archive/programs';
export const GSOC_SITE = 'https://summerofcode.withgoogle.com';

export interface GsocMilestone {
  name: string;
  label: string;
  date: string;
  /** Evaluation milestones repeat per project size (small/medium/large). */
  projectSize: string | null;
}

export interface GsocProgram {
  year: number;
  phase: string;
  active: boolean;
  milestones: GsocMilestone[];
  orgsAccepted: number | null;
  projects: number | null;
}

export interface GsocOrganization {
  name: string;
  slug: string;
  logo: string | null;
  tagline: string;
  categories: string[];
  tech: string[];
  topics: string[];
  sourceCode: string | null;
  ideas: string | null;
  website: string | null;
  url: string;
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const strings = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);
const httpUrl = (value: unknown) => (typeof value === 'string' && /^https:\/\//.test(value) ? value : null);
const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

async function getJson(path: string, revalidate: number, base = API): Promise<unknown> {
  try {
    const response = await fetch(`${base}${path}`, { next: { revalidate }, signal: AbortSignal.timeout(8000) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

/** Every edition Google publishes, oldest first. Empty when the API is unreachable. */
export async function getGsocPrograms(): Promise<GsocProgram[]> {
  const raw = await getJson('/', 21600);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): GsocProgram | null => {
      const program = entry as Record<string, unknown>;
      const year = Number(program.slug);
      if (!Number.isInteger(year)) return null;
      const stats = (program.stats ?? {}) as Record<string, unknown>;
      const milestones = (Array.isArray(program.milestones) ? program.milestones : [])
        .map((m): GsocMilestone | null => {
          const milestone = m as Record<string, unknown>;
          const date = text(milestone.datetime);
          if (!text(milestone.name) || Number.isNaN(Date.parse(date))) return null;
          return {
            name: text(milestone.name),
            label: text(milestone.label) || text(milestone.name),
            date,
            projectSize: text(milestone.project_size) || null,
          };
        })
        .filter((m): m is GsocMilestone => m !== null);
      return {
        year,
        phase: text(program.phase),
        active: program.is_active === true,
        milestones,
        orgsAccepted: count(stats.orgs_accepted),
        projects: count(stats.allocated_projects),
      };
    })
    .filter((p): p is GsocProgram => p !== null)
    .sort((a, b) => a.year - b.year);
}

/** The running edition, or the newest published one. */
export async function getCurrentGsocProgram(): Promise<GsocProgram | null> {
  const programs = await getGsocPrograms();
  return programs.find(p => p.active) ?? programs.at(-1) ?? null;
}

/** Accepted organizations for one edition, as published by Google. */
export async function getGsocOrganizations(year: number): Promise<GsocOrganization[]> {
  const raw = await getJson(`/${year}/organizations/`, 86400);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): GsocOrganization | null => {
      const org = entry as Record<string, unknown>;
      const name = text(org.name);
      const slug = text(org.slug);
      if (!name || !/^[a-z0-9-]+$/.test(slug)) return null;
      return {
        name,
        slug,
        logo: httpUrl(org.logo_url),
        tagline: text(org.tagline),
        categories: strings(org.categories),
        tech: strings(org.tech_tags),
        topics: strings(org.topic_tags),
        sourceCode: httpUrl(org.source_code),
        ideas: httpUrl(org.ideas_link),
        website: httpUrl(org.website_url),
        url: `${GSOC_SITE}/programs/${year}/organizations/${slug}`,
      };
    })
    .filter((o): o is GsocOrganization => o !== null);
}

/** "The Apache Software Foundation" and "Apache Software Foundation" are one organization. */
export function orgNameKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9]+/g, '');
}

export function websiteKey(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).host.replace(/^www\./, '').toLowerCase();
    // Shared hosts say nothing about which organization a page belongs to.
    return /(^|\.)(github\.com|gitlab\.com|google\.com|sites\.google\.com|blogspot\.com|wordpress\.com)$/.test(host) ? null : host;
  } catch {
    return null;
  }
}

export interface GsocHistory {
  /** Every edition the history covers, oldest first. */
  years: number[];
  /** The editions an organization took part in, matched by name or website. */
  yearsOf(org: { name: string; website?: string | null }): number[];
}

interface YearRoster {
  year: number;
  names: Set<string>;
  sites: Set<string>;
}

async function archiveRoster(year: number): Promise<YearRoster | null> {
  const raw = await getJson(`/${year}/organizations/`, 604800, ARCHIVE);
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const orgs = raw.map(entry => entry as Record<string, unknown>);
  return {
    year,
    names: new Set(orgs.map(org => orgNameKey(text(org.name))).filter(Boolean)),
    sites: new Set(orgs.map(org => websiteKey(httpUrl(org.website_url))).filter((s): s is string => Boolean(s))),
  };
}

/**
 * Who took part in which edition, from Google's archive (2016 onwards) and
 * the current program API. Rosters change rarely, so archived years are
 * cached for a week and current ones for a day.
 */
export async function getGsocHistory(): Promise<GsocHistory> {
  const [archived, programs] = await Promise.all([getJson('/', 604800, ARCHIVE), getGsocPrograms()]);
  const currentYears = programs.map(p => p.year);
  const archivedYears = (Array.isArray(archived) ? archived : [])
    .map(entry => Number((entry as Record<string, unknown>).slug))
    .filter(year => Number.isInteger(year) && !currentYears.includes(year));

  const rosters = (
    await Promise.all([
      ...archivedYears.map(archiveRoster),
      ...currentYears.map(async (year): Promise<YearRoster | null> => {
        const orgs = await getGsocOrganizations(year);
        if (orgs.length === 0) return null;
        return {
          year,
          names: new Set(orgs.map(org => orgNameKey(org.name))),
          sites: new Set(orgs.map(org => websiteKey(org.website)).filter((s): s is string => Boolean(s))),
        };
      }),
    ])
  )
    .filter((r): r is YearRoster => r !== null)
    .sort((a, b) => a.year - b.year);

  return {
    years: rosters.map(r => r.year),
    yearsOf(org) {
      const name = orgNameKey(org.name);
      const site = websiteKey(org.website);
      return rosters.filter(r => r.names.has(name) || (site !== null && r.sites.has(site))).map(r => r.year);
    },
  };
}
