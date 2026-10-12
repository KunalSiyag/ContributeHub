import { ContributionEvent, EventDeadline, EventPhase, EventStatus } from '@/types';

type MonthDay = [month: number, day: number];

interface CohortTemplate {
  label?: string;
  applicationsOpen?: MonthDay;
  applicationsClose?: MonthDay;
  programStart: MonthDay;
  programEnd: MonthDay;
}

interface ProgramTemplate {
  key: string;
  shortName: string;
  nameTemplate: (year: number) => string;
  description: string;
  longDescription: string;
  website: string;
  logo: string;
  color: string;
  organizer: string;
  type: 'program' | 'fest' | 'mentorship';
  isPaid: boolean;
  stipendNote?: string;
  cohortsNote?: string;
  participatingOrgs?: number;
  totalContributors?: number;
  labels: string[];
  cohorts: CohortTemplate[];
}

function isoDate(year: number, monthDay: MonthDay): string {
  const [m, d] = monthDay;
  return new Date(Date.UTC(year, m - 1, d)).toISOString().split('T')[0];
}

export interface ResolvedEdition {
  year: number;
  cohortLabel?: string;
  applicationStart?: string;
  applicationDeadline?: string;
  contributionStart: string;
  contributionEnd: string;
  /** Set when the dates come from the program itself rather than calendar rules. */
  officialSource?: string;
  /** Set when the dates come from the community program list. */
  communitySource?: string;
  /** Set when this edition isn't announced yet and repeats last year's published dates. */
  projectedFrom?: ProjectedFrom;
  /** Further dates the program published (results, final deadlines…), in date order. */
  milestones?: EventDeadline[];
}

export interface ProjectedFrom {
  year: number;
  /** Page the original dates came from. */
  source: string;
  /** True when those dates were the community list's rather than the program's. */
  community: boolean;
}

/** A program Orion has no built-in template for, found with its dates (community list). */
export interface DiscoveredProgram {
  shortName: string;
  name: string;
  description: string;
  website: string;
  organizer: string;
  type: 'program' | 'fest' | 'mentorship';
  isPaid: boolean;
  stipendNote?: string;
}

/** Dates a program publishes itself; they replace the calendar rules for that edition. */
export interface OfficialSchedule {
  /** The template cohort these dates belong to; omit for single-cohort programs. */
  cohort?: string;
  applicationStart?: string;
  applicationDeadline?: string;
  contributionStart: string;
  contributionEnd: string;
  /** Page the dates come from. */
  source: string;
  /** Other published dates worth a countdown, e.g. Outreachy's final application deadline. */
  milestones?: EventDeadline[];
  /** 'community' when the dates come from the community program list, not the program. */
  kind?: 'official' | 'community';
  /** Set for programs found in the community list rather than Orion's own templates. */
  program?: DiscoveredProgram;
}

/** Official schedules by program key, then edition year: one, or one per cohort (see programs.server.ts). */
export type OfficialSchedules = Record<string, Record<number, OfficialSchedule | OfficialSchedule[]>>;

function sortedMilestones(milestones: EventDeadline[] | undefined) {
  return milestones?.length ? [...milestones].sort((a, b) => a.date.localeCompare(b.date)) : undefined;
}

function fromSchedule(year: number, schedule: OfficialSchedule, cohortLabel?: string): ResolvedEdition {
  const community = schedule.kind === 'community';
  return {
    year,
    cohortLabel,
    applicationStart: schedule.applicationStart,
    applicationDeadline: schedule.applicationDeadline,
    contributionStart: schedule.contributionStart,
    contributionEnd: schedule.contributionEnd,
    ...(community ? { communitySource: schedule.source } : { officialSource: schedule.source }),
    milestones: sortedMilestones(schedule.milestones),
  };
}

/** The same day a year later (29 February rolls over to 1 March). */
function nextYear(iso: string): string;
function nextYear(iso: string | undefined): string | undefined;
function nextYear(iso: string | undefined) {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y + 1, m - 1, d)).toISOString().slice(0, 10);
}

/**
 * An edition the program hasn't announced yet, laid out on last year's
 * published dates: closer to reality than a calendar rule, and labelled as
 * expected rather than official.
 */
function projectSchedule(year: number, schedule: OfficialSchedule, cohortLabel?: string): ResolvedEdition {
  return {
    year,
    cohortLabel,
    applicationStart: nextYear(schedule.applicationStart),
    applicationDeadline: nextYear(schedule.applicationDeadline),
    contributionStart: nextYear(schedule.contributionStart),
    contributionEnd: nextYear(schedule.contributionEnd),
    projectedFrom: { year: year - 1, source: schedule.source, community: schedule.kind === 'community' },
    milestones: sortedMilestones(schedule.milestones?.map(m => ({ label: m.label, date: nextYear(m.date) }))),
  };
}

const schedulesFor = (official: OfficialSchedules | undefined, key: string, year: number): OfficialSchedule[] => {
  const entry = official?.[key]?.[year];
  return entry ? (Array.isArray(entry) ? entry : [entry]) : [];
};

function mdOrdinal([m, d]: MonthDay): number {
  return m * 31 + d;
}

function resolveEditionsForYear(t: ProgramTemplate, year: number, official?: OfficialSchedules): ResolvedEdition[] {
  const schedules = schedulesFor(official, t.key, year);
  const lastYear = schedulesFor(official, t.key, year - 1);
  if (t.cohorts.length === 1) {
    const single = schedules.find(schedule => !schedule.cohort);
    if (single) return [fromSchedule(year, single)];
    const previous = lastYear.find(schedule => !schedule.cohort);
    if (previous) return [projectSchedule(year, previous)];
  }

  return t.cohorts.map(c => {
    const published = c.label ? schedules.find(schedule => schedule.cohort === c.label) : undefined;
    if (published) return fromSchedule(year, published, c.label);
    const previous = c.label ? lastYear.find(schedule => schedule.cohort === c.label) : undefined;
    if (previous) return projectSchedule(year, previous, c.label);

    const contributionStart = isoDate(year, c.programStart);

    // Program end crosses into the next calendar year when it sits earlier
    // in the year than the start (e.g. a December -> March internship).
    const endYear = mdOrdinal(c.programEnd) < mdOrdinal(c.programStart) ? year + 1 : year;
    const contributionEnd = isoDate(endYear, c.programEnd);

    // Application windows that sit later in the calendar year than the
    // program start belong to the preceding annual cycle (Nov -> Jan cohort).
    let applicationStart: string | undefined;
    if (c.applicationsOpen) {
      const candidate = isoDate(year, c.applicationsOpen);
      applicationStart = candidate > contributionStart ? isoDate(year - 1, c.applicationsOpen) : candidate;
    }

    // A close date before the window opens, or after the program has ended,
    // belongs to the previous cycle (e.g. MLH Spring: close Dec 15 for a
    // cohort that starts in January).
    let applicationDeadline: string | undefined;
    if (c.applicationsClose) {
      const candidate = isoDate(year, c.applicationsClose);
      applicationDeadline =
        (applicationStart && candidate < applicationStart) || candidate > contributionEnd
          ? isoDate(year - 1, c.applicationsClose)
          : candidate;
    }

    return {
      year,
      cohortLabel: c.label,
      applicationStart,
      applicationDeadline,
      contributionStart,
      contributionEnd,
    };
  });
}

const PROGRAM_TEMPLATES: ProgramTemplate[] = [  {
    key: 'gsoc',
    shortName: 'GSoC',
    nameTemplate: y => `Google Summer of Code ${y}`,
    description: 'A global, online mentoring program focused on introducing new contributors to open source software development.',
    longDescription: 'Google Summer of Code is a global, online program focused on bringing new contributors into open source software development. Contributors work with an open source organization on a 12+ week programming project under the guidance of mentors. Applications are submitted against published project ideas during the annual application window.',
    website: 'https://summerofcode.withgoogle.com',
    logo: '/events/gsoc.png',
    color: '#4285F4',
    organizer: 'Google',
    type: 'program',
    isPaid: true,
    stipendNote: '$750 - $6,600 depending on country and project size',
    participatingOrgs: 200,
    totalContributors: 1200,
    labels: ['gsoc', 'paid', 'mentorship'],
    cohorts: [
      {
        applicationsOpen: [3, 24],
        applicationsClose: [4, 8],
        programStart: [5, 25],
        programEnd: [8, 24],
      },
    ],
  },
  {
    key: 'gssoc',
    shortName: 'GSSoC',
    nameTemplate: y => `GirlScript Summer of Code ${y}`,
    description: 'An open-source program by GirlScript Foundation to help beginners contribute to open source and gain experience.',
    longDescription: 'GirlScript Summer of Code is a 3-month long open source program by GirlScript Foundation. Participants contribute to partner projects, earn points and certificates, and are guided by mentors throughout the coding period.',
    website: 'https://gssoc.girlscript.tech',
    logo: '/events/gssoc.png',
    color: '#FF6B35',
    organizer: 'GirlScript Foundation',
    type: 'program',
    isPaid: false,
    participatingOrgs: 150,
    totalContributors: 5000,
    labels: ['gssoc', 'beginner-friendly', 'swag'],
    cohorts: [
      {
        applicationsOpen: [1, 20],
        applicationsClose: [3, 9],
        programStart: [3, 10],
        programEnd: [6, 10],
      },
    ],
  },
  {
    key: 'hacktoberfest',
    shortName: 'Hacktoberfest',
    nameTemplate: y => `Hacktoberfest ${y}`,
    description: 'A month-long celebration of open source software hosted by DigitalOcean. Ship 4 accepted pull requests during October.',
    longDescription: 'Hacktoberfest is a month-long celebration of open source projects, their maintainers, and the entire community of contributors. Register any time in October, open 4 pull requests marked hacktoberfest-accepted or to repos labeled hacktoberfest, and complete the fest to plant a tree or win digital rewards.',
    website: 'https://hacktoberfest.com',
    logo: '/events/hacktoberfest.png',
    color: '#9C4668',
    organizer: 'DigitalOcean',
    type: 'fest',
    isPaid: false,
    labels: ['hacktoberfest', 'beginner-friendly', 'swag'],
    cohorts: [
      {
        applicationsOpen: [9, 26],
        applicationsClose: [10, 31],
        programStart: [10, 1],
        programEnd: [10, 31],
      },
    ],
  },
  {
    key: 'mlh-fellowship',
    shortName: 'MLH',
    nameTemplate: y => `MLH Fellowship ${y}`,
    description: 'A 12-week remote internship alternative where fellows ship code to major open source projects.',
    longDescription: 'The MLH Fellowship is a remote internship alternative for aspiring software engineers. Fellows work in small pods on real-world open source projects, get mentorship from experienced engineers, and build a portfolio of merged contributions.',
    website: 'https://fellowship.mlh.io',
    logo: '/events/mlh.png',
    color: '#E73427',
    organizer: 'Major League Hacking',
    type: 'program',
    isPaid: true,
    stipendNote: 'Stipends and travel grants available for eligible tracks',
    cohortsNote: 'Three cohorts per year: Spring, Summer, Fall. Applications roll roughly 3 months ahead of each cohort.',
    totalContributors: 500,
    labels: ['mlh', 'paid', 'mentorship', 'fellowship'],
    cohorts: [
      {
        label: 'Spring Cohort',
        applicationsOpen: [11, 1],
        applicationsClose: [12, 15],
        programStart: [1, 12],
        programEnd: [4, 12],
      },
      {
        label: 'Summer Cohort',
        applicationsOpen: [2, 16],
        applicationsClose: [4, 30],
        programStart: [6, 8],
        programEnd: [8, 28],
      },
      {
        label: 'Fall Cohort',
        applicationsOpen: [5, 1],
        applicationsClose: [7, 15],
        programStart: [9, 8],
        programEnd: [12, 18],
      },
    ],
  },
  {
    key: 'outreachy',
    shortName: 'Outreachy',
    nameTemplate: y => `Outreachy ${y}`,
    description: 'Paid, remote internships in open source for people subject to systemic bias and underrepresented in tech.',
    longDescription: 'Outreachy provides paid internships in open source and open science. Interns work remotely with mentors from FOSS communities for 13 weeks. Outreachy explicitly invites women (both cis and trans), trans men, and genderqueer people to apply.',
    website: 'https://www.outreachy.org',
    logo: '/events/outreachy.png',
    color: '#7B4A9E',
    organizer: 'Software Freedom Conservancy',
    type: 'program',
    isPaid: true,
    stipendNote: '$7,000 USD stipend for the 13-week internship',
    cohortsNote: 'Two cohorts per year: May-August and December-March.',
    participatingOrgs: 40,
    totalContributors: 100,
    labels: ['outreachy', 'paid', 'diversity', 'mentorship'],
    cohorts: [
      {
        label: 'May Cohort',
        applicationsOpen: [1, 15],
        applicationsClose: [4, 1],
        programStart: [5, 4],
        programEnd: [8, 14],
      },
      {
        label: 'December Cohort',
        applicationsOpen: [8, 1],
        applicationsClose: [10, 1],
        programStart: [12, 1],
        programEnd: [3, 14],
      },
    ],
  },
  {
    key: 'lfx-mentorship',
    shortName: 'LFX',
    nameTemplate: y => `LFX Mentorship ${y}`,
    description: 'Linux Foundation mentorship for aspiring developers working on CNCF, LF Networking and LF AI projects.',
    longDescription: 'LFX Mentorship provides a structured remote learning program for aspiring developers. Mentees work on Linux Foundation hosted projects including CNCF, LF Networking, LF AI & Data and more, with paid stipends on many tracks.',
    website: 'https://lfx.linuxfoundation.org/tools/mentorship',
    logo: '/events/lfx.png',
    color: '#003366',
    organizer: 'Linux Foundation',
    type: 'mentorship',
    isPaid: true,
    stipendNote: '$500 - $3,000 per term depending on the project track',
    cohortsNote: 'Three terms per year: March–May, June–August and September–November.',
    participatingOrgs: 60,
    totalContributors: 300,
    labels: ['lfx', 'linux', 'cncf', 'paid', 'mentorship'],
    cohorts: [
      // Shaped on LFX's published 2026 terms; official dates replace these per term.
      {
        label: 'Spring Term',
        applicationsOpen: [1, 27],
        applicationsClose: [2, 21],
        programStart: [3, 16],
        programEnd: [5, 16],
      },
      {
        label: 'Summer Term',
        applicationsOpen: [5, 1],
        applicationsClose: [5, 27],
        programStart: [6, 15],
        programEnd: [8, 16],
      },
      {
        label: 'Fall Term',
        applicationsOpen: [8, 3],
        applicationsClose: [8, 18],
        programStart: [9, 15],
        programEnd: [11, 15],
      },
    ],
  },
  {
    key: 'swoc',
    shortName: 'SWoC',
    nameTemplate: y => `Social Winter of Code ${y}`,
    description: 'A winter-long open source program where beginners contribute to curated projects over three months.',
    longDescription: 'Social Winter of Code is an open source program that runs through the winter. Contributors pick projects from the SWoC catalogue, submit pull requests, and earn points, certificates and swag while learning collaborative development.',
    website: 'https://swoc.in',
    logo: '/events/swoc.png',
    color: '#0EA5E9',
    organizer: 'Social Foundation',
    type: 'program',
    isPaid: false,
    participatingOrgs: 60,
    totalContributors: 2500,
    labels: ['swoc', 'beginner-friendly', 'winter', 'swag'],
    cohorts: [
      {
        applicationsOpen: [11, 15],
        applicationsClose: [1, 14],
        programStart: [1, 15],
        programEnd: [4, 15],
      },
    ],
  },
  {
    key: '24pullrequests',
    shortName: '24PRs',
    nameTemplate: y => `24 Pull Requests ${y}`,
    description: 'Give back to open source every day of December. One small pull request per day until Christmas Eve.',
    longDescription: '24 Pull Requests is a yearly initiative to encourage contributors around the world to give back to open source every day between December 1st and December 24th. Small contributions count: docs, tests, bug fixes and tiny features all qualify.',
    website: 'https://24pullrequests.com',
    logo: '/events/24pr.png',
    color: '#16A34A',
    organizer: 'Community',
    type: 'fest',
    isPaid: false,
    totalContributors: 20000,
    labels: ['24pullrequests', 'beginner-friendly', 'december'],
    cohorts: [
      {
        programStart: [12, 1],
        programEnd: [12, 24],
      },
    ],
  },
];

export const PROGRAM_TEMPLATES_FOR_TESTING: readonly ProgramTemplate[] = PROGRAM_TEMPLATES;

const BUILT_IN_KEYS = new Set(PROGRAM_TEMPLATES.map(t => t.key));
const monthDay = (iso: string): MonthDay => [Number(iso.slice(5, 7)), Number(iso.slice(8, 10))];
const discoveredCache = new WeakMap<OfficialSchedules, ProgramTemplate[]>();

/**
 * Orion's own templates plus every program the schedules introduce
 * (community-list programs with dates). A discovered program's calendar
 * rule repeats its latest published dates, so it rolls forward too.
 */
function allTemplates(official?: OfficialSchedules): ProgramTemplate[] {
  if (!official) return PROGRAM_TEMPLATES;
  const cached = discoveredCache.get(official);
  if (cached) return cached;
  const discovered: ProgramTemplate[] = [];
  for (const [key, years] of Object.entries(official)) {
    if (BUILT_IN_KEYS.has(key)) continue;
    const latest = Object.keys(years)
      .map(Number)
      .sort((a, b) => b - a)
      .flatMap(year => schedulesFor(official, key, year))
      .find(schedule => schedule.program);
    if (!latest?.program) continue;
    const meta = latest.program;
    discovered.push({
      key,
      shortName: meta.shortName,
      nameTemplate: year => `${meta.name} ${year}`,
      description: meta.description,
      longDescription: meta.description,
      website: meta.website,
      logo: '',
      color: '#808080',
      organizer: meta.organizer,
      type: meta.type,
      isPaid: meta.isPaid,
      stipendNote: meta.stipendNote,
      labels: [],
      cohorts: [
        {
          applicationsOpen: latest.applicationStart ? monthDay(latest.applicationStart) : undefined,
          applicationsClose: latest.applicationDeadline ? monthDay(latest.applicationDeadline) : undefined,
          programStart: monthDay(latest.contributionStart),
          programEnd: monthDay(latest.contributionEnd),
        },
      ],
    });
  }
  const all = [...PROGRAM_TEMPLATES, ...discovered];
  discoveredCache.set(official, all);
  return all;
}

function todayISO(now: Date = new Date()): string {
  return now.toISOString().split('T')[0];
}

// Pick the most relevant upcoming/current edition across all cohorts of a program
export function resolveCurrentEdition(t: ProgramTemplate, now: Date = new Date(), official?: OfficialSchedules): ResolvedEdition {
  const year = now.getUTCFullYear();
  // Include last year's editions: cohorts that start in December run into
  // the next calendar year and are still active in its first months.
  const candidates = [
    ...resolveEditionsForYear(t, year - 1, official),
    ...resolveEditionsForYear(t, year, official),
    ...resolveEditionsForYear(t, year + 1, official),
  ];
  const today = todayISO(now);

  const activeOrFuture = candidates.filter(e => e.contributionEnd >= today);
  if (activeOrFuture.length > 0) {
    // Prefer one already running; otherwise the soonest starting one
    const running = activeOrFuture.filter(e => e.contributionStart <= today);
    if (running.length > 0) return running[0];
    return activeOrFuture.sort((a, b) => a.contributionStart.localeCompare(b.contributionStart))[0];
  }

  return candidates[0];
}

function computePhase(edition: ResolvedEdition, now: Date): EventPhase {
  const today = todayISO(now);
  const { contributionStart, contributionEnd, applicationStart, applicationDeadline } = edition;

  if (today > contributionEnd) return 'ended';
  if (today >= contributionStart && today <= contributionEnd) return 'running';
  if (applicationDeadline && today > applicationDeadline && today < contributionStart) return 'applications-closed';
  if (applicationStart && applicationDeadline && today >= applicationStart && today <= applicationDeadline) return 'applications-open';
  return 'pre-announcement';
}

function computeStatus(phase: EventPhase): EventStatus {
  if (phase === 'running') return 'active';
  if (phase === 'ended') return 'ended';
  return 'upcoming';
}

function computeNextDeadline(edition: ResolvedEdition, phase: EventPhase, now: Date): EventDeadline | undefined {
  const today = todayISO(now);
  // Published milestones are more precise than the phase heuristics below
  // (e.g. Outreachy's final application deadline falls between its windows).
  if (edition.milestones?.length && phase !== 'ended') {
    const dates: EventDeadline[] = [
      ...(edition.applicationStart ? [{ label: 'Applications open', date: edition.applicationStart }] : []),
      ...(edition.applicationDeadline ? [{ label: 'Application deadline', date: edition.applicationDeadline }] : []),
      { label: 'Program starts', date: edition.contributionStart },
      { label: 'Program ends', date: edition.contributionEnd },
      ...edition.milestones,
    ];
    const upcoming = dates.filter(d => d.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    if (upcoming.length > 0) return upcoming[0];
  }
  switch (phase) {
    case 'pre-announcement':
      if (edition.applicationStart && edition.applicationStart >= today) {
        return { label: 'Applications open', date: edition.applicationStart };
      }
      // Only a deadline is known (no opening date): count down to it.
      if (edition.applicationDeadline && edition.applicationDeadline >= today) {
        return { label: 'Application deadline', date: edition.applicationDeadline };
      }
      return { label: 'Program starts', date: edition.contributionStart };
    case 'applications-open':
      return { label: 'Application deadline', date: edition.applicationDeadline || edition.contributionStart };
    case 'applications-closed':
      return { label: 'Program starts', date: edition.contributionStart };
    case 'running':
      return { label: 'Program ends', date: edition.contributionEnd };
    default:
      return undefined;
  }
}

function kebab(value: string) {
  return value.toLowerCase().replace(/\s+/g, '-');
}

/** Stable slug for one edition, e.g. "gsoc-2027" or "outreachy-2026-december-cohort". */
export function editionSlug(key: string, year: number, cohortLabel?: string) {
  return `${key}-${year}${cohortLabel ? `-${kebab(cohortLabel)}` : ''}`;
}

function materializeEvent(t: ProgramTemplate, edition: ResolvedEdition, now: Date): ContributionEvent {
  const phase = computePhase(edition, now);
  const slug = editionSlug(t.key, edition.year, edition.cohortLabel);

  return {
    id: slug,
    slug,
    programKey: t.key,
    name: t.nameTemplate(edition.year),
    shortName: t.shortName,
    description: t.description,
    longDescription: t.longDescription,
    website: t.website,
    logo: t.logo,
    color: t.color,
    applicationStart: edition.applicationStart,
    applicationDeadline: edition.applicationDeadline,
    contributionStart: edition.contributionStart,
    contributionEnd: edition.contributionEnd,
    organizer: t.organizer,
    type: t.type,
    isPaid: t.isPaid,
    isRemote: true,
    stipendNote: t.stipendNote,
    applicationUrl: t.website,
    cohortsNote: t.cohortsNote,
    participatingOrgs: t.participatingOrgs,
    totalContributors: t.totalContributors,
    labels: t.labels,
    status: computeStatus(phase),
    phase,
    nextDeadline: computeNextDeadline(edition, phase, now),
    editionYear: edition.year,
    officialSource: edition.officialSource,
    communitySource: edition.communitySource,
    projectedFrom: edition.projectedFrom,
    milestones: edition.milestones,
  };
}

export function getEventStatus(event: ContributionEvent): EventStatus {
  return event.status ?? 'upcoming';
}

export function daysUntil(dateStr: string, now: Date = new Date()): number {
  const target = new Date(dateStr + 'T00:00:00Z').getTime();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime();
  return Math.round((target - startOfToday) / 86_400_000);
}

export function getEventTimeInfo(event: ContributionEvent, now: Date = new Date()): string {
  switch (event.phase) {
    case 'pre-announcement': {
      const target = event.nextDeadline?.date || event.contributionStart;
      const d = daysUntil(target, now);
      return d === 1 ? 'Starts tomorrow' : `Starts in ${d} days`;
    }
    case 'applications-open': {
      const d = daysUntil(event.applicationDeadline!, now);
      return d <= 0 ? 'Applications closing' : d === 1 ? 'Applications close tomorrow' : `${d} days to apply`;
    }
    case 'applications-closed': {
      const d = daysUntil(event.contributionStart, now);
      return d === 1 ? 'Kicks off tomorrow' : `Kicks off in ${d} days`;
    }
    case 'running': {
      const d = daysUntil(event.contributionEnd, now);
      return d === 1 ? 'Ends tomorrow' : `${d} days left`;
    }
    default:
      return 'Concluded';
  }
}

export function formatDeadlineDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function toCalendarDates(dateStr: string): { start: string; endNextDay: string } {
  const start = dateStr.replace(/-/g, '');
  const endDate = new Date(dateStr + 'T00:00:00Z');
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const endNextDay = endDate.toISOString().split('T')[0].replace(/-/g, '');
  return { start, endNextDay };
}

export interface CalendarLinks {
  googleUrl: string;
  icsDataUri: string;
}

export function buildCalendarLinks(
  title: string,
  dateStr: string,
  details: string,
  location?: string
): CalendarLinks {
  const { start, endNextDay } = toCalendarDates(dateStr);

  const googleParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${endNextDay}`,
    details,
    ...(location ? { location } : {}),
  });
  const googleUrl = `https://calendar.google.com/calendar/render?${googleParams.toString()}`;

  // RFC 5545: escape text values and fold lines longer than 75 octets.
  const escapeText = (value: string) =>
    value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const fold = (line: string) => {
    const parts: string[] = [];
    let rest = line;
    while (rest.length > 74) {
      parts.push(rest.slice(0, 74));
      rest = ` ${rest.slice(74)}`;
    }
    parts.push(rest);
    return parts.join('\r\n');
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Orion//Open Source Hub//EN',
    'BEGIN:VEVENT',
    `UID:${start}-${title.replace(/\s+/g, '-').toLowerCase()}@orion`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${endNextDay}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(details)}`,
    ...(location ? [`LOCATION:${escapeText(location)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .map(fold)
    .join('\r\n');

  const icsDataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

  return { googleUrl, icsDataUri };
}

export function getUpcomingDeadlines(
  withinDays: number = 30,
  now: Date = new Date(),
  official?: OfficialSchedules
): Array<{ event: ContributionEvent; deadline: NonNullable<ContributionEvent['nextDeadline']> }> {
  return getAllEvents(now, official)
    .map(event =>
      event.nextDeadline && daysUntil(event.nextDeadline.date, now) >= 0
        ? { event, deadline: event.nextDeadline }
        : null
    )
    .filter((x): x is { event: ContributionEvent; deadline: NonNullable<ContributionEvent['nextDeadline']> } =>
      x !== null && daysUntil(x.deadline.date, now) <= withinDays
    )
    .sort((a, b) => a.deadline.date.localeCompare(b.deadline.date));
}

export function getAllEvents(now: Date = new Date(), official?: OfficialSchedules): ContributionEvent[] {
  return allTemplates(official).map(t => materializeEvent(t, resolveCurrentEdition(t, now, official), now));
}

export function getProgramKeys(): string[] {
  return PROGRAM_TEMPLATES.map(t => t.key);
}

/**
 * Find an edition by slug. Current editions match directly; older or future
 * slugs like "gsoc-2026" are rebuilt from the template so shared links keep
 * working after a program rolls over to its next edition.
 */
export function getEventBySlug(slug: string, now: Date = new Date(), official?: OfficialSchedules): ContributionEvent | undefined {
  const current = getAllEvents(now, official).find(e => e.slug === slug);
  if (current) return current;

  const match = slug.match(/^(.+?)-(\d{4})(?:-(.+))?$/);
  if (!match) return undefined;
  const [, key, yearText, cohort] = match;
  const template = allTemplates(official).find(t => t.key === key);
  const year = Number(yearText);
  if (!template || year < 2015 || year > now.getUTCFullYear() + 2) return undefined;

  const edition = resolveEditionsForYear(template, year, official).find(e =>
    cohort ? e.cohortLabel && kebab(e.cohortLabel) === cohort : !e.cohortLabel
  );
  return edition ? materializeEvent(template, edition, now) : undefined;
}

/** The current edition for a bare program key like "gsoc", if it exists. */
export function getCurrentEditionForProgram(key: string, now: Date = new Date(), official?: OfficialSchedules): ContributionEvent | undefined {
  const template = allTemplates(official).find(t => t.key === key);
  return template ? materializeEvent(template, resolveCurrentEdition(template, now, official), now) : undefined;
}

export function getEventsByStatus(status: EventStatus, now: Date = new Date(), official?: OfficialSchedules): ContributionEvent[] {
  return getAllEvents(now, official).filter(event => event.status === status);
}

export function getActiveOrUpcomingEvents(now: Date = new Date(), official?: OfficialSchedules): ContributionEvent[] {
  return getAllEvents(now, official).filter(event => event.status !== 'ended');
}

/**
 * Every edition, across all cohorts, whose application window or program
 * period overlaps the inclusive ISO date range [from, to]. Results follow the
 * program order of getAllEvents(), then each edition's first date. Phases and
 * next deadlines are computed relative to `now`.
 */
export function getEditionsInRange(
  from: string,
  to: string,
  now: Date = new Date(),
  official?: OfficialSchedules
): ContributionEvent[] {
  // An edition resolved for year Y can open applications in Y-1 and end in Y+1.
  const firstYear = Number(from.slice(0, 4)) - 1;
  const lastYear = Number(to.slice(0, 4)) + 1;

  return allTemplates(official).flatMap(template => {
    const editions: ResolvedEdition[] = [];
    for (let year = firstYear; year <= lastYear; year++) {
      for (const edition of resolveEditionsForYear(template, year, official)) {
        const dates = [
          edition.applicationStart,
          edition.applicationDeadline,
          edition.contributionStart,
          edition.contributionEnd,
        ]
          .filter((date): date is string => Boolean(date))
          .sort();
        if (dates[0] <= to && dates[dates.length - 1] >= from) editions.push(edition);
      }
    }
    return editions
      .sort((a, b) =>
        (a.applicationStart ?? a.contributionStart).localeCompare(b.applicationStart ?? b.contributionStart)
      )
      .map(edition => materializeEvent(template, edition, now));
  });
}

/**
 * Cohort label of an edition ("Fall Cohort", "Spring Term") for programs that
 * run several cohorts a year; undefined for single-cohort programs.
 */
export function getCohortLabel(
  event: Pick<ContributionEvent, 'slug' | 'programKey' | 'editionYear'>
): string | undefined {
  const template = PROGRAM_TEMPLATES.find(t => t.key === event.programKey);
  if (!template || event.editionYear === undefined) return undefined;
  const prefix = `${event.programKey}-${event.editionYear}-`;
  if (!event.slug.startsWith(prefix)) return undefined;
  const suffix = event.slug.slice(prefix.length);
  return template.cohorts.find(cohort => cohort.label && kebab(cohort.label) === suffix)?.label;
}

// Featured organizations seeded per program. Stars/forks are refreshed at runtime
// via /api/organizations which merges these seeds with live GitHub repo data.
export interface EventOrganization {
  name: string;
  slug: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
  eventLabel: string;
  participationYears?: number[];
}

export const GSSOC_ORGANIZATIONS: EventOrganization[] = [
  {
    name: 'Rocket.Chat',
    slug: 'RocketChat/Rocket.Chat',
    description: 'The communications platform that puts data protection first.',
    stars: 42000,
    forks: 10000,
    language: 'TypeScript',
    topics: ['nodejs', 'react', 'meteor', 'gssoc'],
    eventLabel: 'gssoc',
    participationYears: [2021, 2022, 2023, 2024],
  },
  {
    name: 'OpenMRS',
    slug: 'openmrs/openmrs-core',
    description: 'OpenMRS is a patient-based medical record system focusing on giving providers a free customizable EMR.',
    stars: 1400,
    forks: 1200,
    language: 'Java',
    topics: ['healthcare', 'emr', 'gssoc', 'gsoc'],
    eventLabel: 'gssoc',
    participationYears: [2020, 2021, 2022, 2023, 2024],
  },
  {
    name: 'JEECG Boot',
    slug: 'jeecgboot/JeecgBoot',
    description: 'Low code platform for enterprise applications development.',
    stars: 40000,
    forks: 15000,
    language: 'Java',
    topics: ['low-code', 'vue', 'spring-boot', 'gssoc'],
    eventLabel: 'gssoc',
    participationYears: [2023, 2024],
  },
  {
    name: 'Zulip',
    slug: 'zulip/zulip',
    description: 'Powerful, open source group chat for business and personal use.',
    stars: 22000,
    forks: 8000,
    language: 'Python',
    topics: ['python', 'django', 'react', 'gssoc', 'gsoc'],
    eventLabel: 'gssoc',
    participationYears: [2021, 2022, 2023, 2024],
  },
  {
    name: 'Oppia',
    slug: 'oppia/oppia',
    description: 'Tool for collaboratively building interactive lessons.',
    stars: 5800,
    forks: 3400,
    language: 'Python',
    topics: ['education', 'angular', 'python', 'gssoc', 'gsoc'],
    eventLabel: 'gssoc',
    participationYears: [2022, 2023, 2024],
  },
  {
    name: 'FOSSASIA Eventyay',
    slug: 'fossasia/eventyay',
    description: 'Open source event management: ticketing, call for speakers and schedules.',
    stars: 1700,
    forks: 600,
    language: 'Python',
    topics: ['events', 'api', 'gssoc', 'gsoc'],
    eventLabel: 'gssoc',
    participationYears: [2021, 2022, 2023, 2024],
  },
  {
    name: 'TensorFlow',
    slug: 'tensorflow/tensorflow',
    description: 'An Open Source Machine Learning Framework for Everyone.',
    stars: 187000,
    forks: 74000,
    language: 'Python',
    topics: ['machine-learning', 'deep-learning', 'ai', 'gsoc'],
    eventLabel: 'gsoc',
    participationYears: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
  },
  {
    name: 'Kubernetes',
    slug: 'kubernetes/kubernetes',
    description: 'Production-Grade Container Scheduling and Management.',
    stars: 115000,
    forks: 42000,
    language: 'Go',
    topics: ['containers', 'orchestration', 'cloud-native', 'gsoc', 'lfx'],
    eventLabel: 'gsoc',
    participationYears: [2018, 2019, 2020, 2021, 2022, 2023, 2024],
  },
  {
    name: 'Apache Kafka',
    slug: 'apache/kafka',
    description: 'Apache Kafka is an open-source distributed event streaming platform.',
    stars: 29000,
    forks: 13000,
    language: 'Java',
    topics: ['streaming', 'distributed', 'messaging', 'gsoc'],
    eventLabel: 'gsoc',
    participationYears: [2018, 2019, 2020, 2021, 2022, 2023, 2024],
  },
  {
    name: 'Discourse',
    slug: 'discourse/discourse',
    description: 'A platform for community discussion. Free, open, simple.',
    stars: 43000,
    forks: 8500,
    language: 'Ruby',
    topics: ['ruby', 'rails', 'gsoc'],
    eventLabel: 'gsoc',
    participationYears: [2019, 2020, 2021, 2022, 2023, 2024],
  },
  {
    name: 'Blender',
    slug: 'blender/blender',
    description: 'Official mirror of Blender 3D creation suite.',
    stars: 14000,
    forks: 2300,
    language: 'C',
    topics: ['3d', 'graphics', 'animation', 'gsoc'],
    eventLabel: 'gsoc',
    participationYears: [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
  },
  {
    name: 'FFmpeg',
    slug: 'FFmpeg/FFmpeg',
    description: 'A complete, cross-platform solution to record, convert and stream audio and video.',
    stars: 47000,
    forks: 12000,
    language: 'C',
    topics: ['video', 'audio', 'multimedia', 'gsoc'],
    eventLabel: 'gsoc',
    participationYears: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
  },
  {
    name: 'Apache Beam',
    slug: 'apache/beam',
    description: 'Unified programming model to define and execute data processing pipelines.',
    stars: 8200,
    forks: 4400,
    language: 'Java',
    topics: ['big-data', 'stream-processing', 'gsoc'],
    eventLabel: 'gsoc',
    participationYears: [2018, 2019, 2020, 2021, 2022, 2023, 2024],
  },
  {
    name: 'Jenkins',
    slug: 'jenkinsci/jenkins',
    description: 'Jenkins automation server.',
    stars: 24000,
    forks: 9200,
    language: 'Java',
    topics: ['ci-cd', 'automation', 'devops', 'gsoc'],
    eventLabel: 'gsoc',
    participationYears: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
  },
  {
    name: 'LibreOffice',
    slug: 'LibreOffice/core',
    description: 'A powerful free and open source office suite.',
    stars: 2800,
    forks: 900,
    language: 'C++',
    topics: ['office', 'productivity', 'gsoc'],
    eventLabel: 'gsoc',
    participationYears: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
  },
  {
    name: 'GNOME',
    slug: 'GNOME/gnome-shell',
    description: 'GNOME Shell is the graphical shell of the GNOME desktop environment.',
    stars: 1900,
    forks: 500,
    language: 'JavaScript',
    topics: ['linux', 'desktop', 'gsoc'],
    eventLabel: 'gsoc',
    participationYears: [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
  },
  {
    name: 'FreeCodeCamp',
    slug: 'freeCodeCamp/freeCodeCamp',
    description: 'Open-source codebase and curriculum for learning to code.',
    stars: 410000,
    forks: 39000,
    language: 'TypeScript',
    topics: ['education', 'nodejs', 'react', 'hacktoberfest'],
    eventLabel: 'hacktoberfest',
    participationYears: [2018, 2019, 2020, 2021, 2022, 2023, 2024],
  },
  {
    name: 'Godot Engine',
    slug: 'godotengine/godot',
    description: 'Godot Engine – Multi-platform 2D and 3D game engine.',
    stars: 93000,
    forks: 21000,
    language: 'C++',
    topics: ['game-engine', 'games', '3d', 'hacktoberfest'],
    eventLabel: 'hacktoberfest',
    participationYears: [2019, 2020, 2021, 2022, 2023, 2024],
  },
  {
    name: 'Supabase',
    slug: 'supabase/supabase',
    description: 'The open source Firebase alternative for building secure and scalable apps.',
    stars: 78000,
    forks: 7500,
    language: 'TypeScript',
    topics: ['database', 'postgres', 'auth', 'hacktoberfest'],
    eventLabel: 'hacktoberfest',
    participationYears: [2021, 2022, 2023, 2024],
  },
  {
    name: 'Next.js',
    slug: 'vercel/next.js',
    description: 'The React Framework for the Web.',
    stars: 132000,
    forks: 28000,
    language: 'JavaScript',
    topics: ['react', 'framework', 'vercel', 'hacktoberfest'],
    eventLabel: 'hacktoberfest',
    participationYears: [2019, 2020, 2021, 2022, 2023, 2024],
  },
  {
    name: 'Appwrite',
    slug: 'appwrite/appwrite',
    description: 'Build like a team of hundreds.',
    stars: 46000,
    forks: 4100,
    language: 'TypeScript',
    topics: ['backend', 'baas', 'docker', 'hacktoberfest'],
    eventLabel: 'hacktoberfest',
    participationYears: [2021, 2022, 2023, 2024],
  },
  {
    name: 'Mattermost',
    slug: 'mattermost/mattermost',
    description: 'Open source platform for secure collaboration across the entire software development lifecycle.',
    stars: 31000,
    forks: 7400,
    language: 'Go',
    topics: ['chat', 'collaboration', 'devops', 'hacktoberfest'],
    eventLabel: 'hacktoberfest',
    participationYears: [2019, 2020, 2021, 2022, 2023, 2024],
  },
  {
    name: 'Grafana',
    slug: 'grafana/grafana',
    description: 'The open and composable observability and data visualization platform.',
    stars: 67000,
    forks: 12500,
    language: 'TypeScript',
    topics: ['monitoring', 'visualization', 'hacktoberfest'],
    eventLabel: 'hacktoberfest',
    participationYears: [2019, 2020, 2021, 2022, 2023, 2024],
  },
  {
    name: 'Directus',
    slug: 'directus/directus',
    description: 'The Modern Data Stack. Instantly turn your SQL database into a REST+GraphQL API.',
    stars: 29000,
    forks: 4200,
    language: 'TypeScript',
    topics: ['headless-cms', 'api', 'hacktoberfest'],
    eventLabel: 'hacktoberfest',
    participationYears: [2020, 2021, 2022, 2023, 2024],
  },
  {
    name: 'Strapi',
    slug: 'strapi/strapi',
    description: 'The leading open-source headless CMS.',
    stars: 66000,
    forks: 8400,
    language: 'JavaScript',
    topics: ['cms', 'nodejs', 'hacktoberfest'],
    eventLabel: 'hacktoberfest',
    participationYears: [2019, 2020, 2021, 2022, 2023, 2024],
  },
  {
    name: 'CNCF Envoy',
    slug: 'envoyproxy/envoy',
    description: 'Cloud-native high-performance edge/middle/service proxy.',
    stars: 25000,
    forks: 4800,
    language: 'C++',
    topics: ['proxy', 'service-mesh', 'cncf', 'lfx'],
    eventLabel: 'lfx',
    participationYears: [2021, 2022, 2023, 2024],
  },
  {
    name: 'CNCF Prometheus',
    slug: 'prometheus/prometheus',
    description: 'The Prometheus monitoring system and time series database.',
    stars: 57000,
    forks: 9300,
    language: 'Go',
    topics: ['monitoring', 'metrics', 'cncf', 'lfx'],
    eventLabel: 'lfx',
    participationYears: [2021, 2022, 2023, 2024],
  },
  {
    name: 'CNCF Jaeger',
    slug: 'jaegertracing/jaeger',
    description: 'CNCF Jaeger, a Distributed Tracing Platform.',
    stars: 20000,
    forks: 2500,
    language: 'Go',
    topics: ['tracing', 'observability', 'cncf', 'lfx'],
    eventLabel: 'lfx',
    participationYears: [2021, 2022, 2023, 2024],
  },
  {
    name: 'CNCF Fluentd',
    slug: 'fluent/fluentd',
    description: 'Unified Logging Layer.',
    stars: 13000,
    forks: 2400,
    language: 'Ruby',
    topics: ['logging', 'cncf', 'lfx'],
    eventLabel: 'lfx',
    participationYears: [2021, 2022, 2023, 2024],
  },
  {
    name: 'CNCF Vitess',
    slug: 'vitessio/vitess',
    description: 'Database clustering system for horizontal scaling of MySQL.',
    stars: 19000,
    forks: 2200,
    language: 'Go',
    topics: ['mysql', 'database', 'cncf', 'lfx'],
    eventLabel: 'lfx',
    participationYears: [2021, 2022, 2023, 2024],
  },
];

export function getOrganizationsForEvent(eventLabel: string): EventOrganization[] {
  return GSSOC_ORGANIZATIONS.filter(org => org.topics.includes(eventLabel) || org.eventLabel === eventLabel);
}

export function getAllParticipationYears(): number[] {
  const years = new Set<number>();
  GSSOC_ORGANIZATIONS.forEach(org => {
    org.participationYears?.forEach(year => years.add(year));
  });
  return Array.from(years).sort((a, b) => b - a);
}

export function getOrganizationsByYears(years: number[], matchAll: boolean = false): EventOrganization[] {
  if (years.length === 0) return GSSOC_ORGANIZATIONS;

  return GSSOC_ORGANIZATIONS.filter(org => {
    if (!org.participationYears) return false;

    if (matchAll) {
      return years.every(y => org.participationYears!.includes(y));
    } else {
      return years.some(y => org.participationYears!.includes(y));
    }
  });
}
