import 'server-only';
import type { OfficialSchedule } from './events';
import { getReadmeMarkdown } from './github';

/**
 * The wider program directory comes from a community-maintained list
 * (Apache-2.0), read straight from its README: each program's organizer,
 * timeline, stipend and eligibility, plus the dated events in its yearly
 * timeline. New programs added there appear here without a code change.
 */
export const DIRECTORY_REPO = 'yashisrani/List-of-OpenSource-Programs';
export const DIRECTORY_URL = `https://github.com/${DIRECTORY_REPO}`;

export interface DirectoryEvent {
  /** ISO day. */
  date: string;
  /** Last day, for ranges such as "Oct 1-31". */
  endDate?: string;
  label: string;
}

export interface DirectoryProgram {
  name: string;
  /** Short form used in event names, e.g. "GSoC". */
  acronym: string | null;
  url: string;
  organization: string;
  timeline: string;
  /** Stipend or prizes, as listed. */
  reward: string;
  eligibility: string;
  kind: 'fellowship' | 'challenge';
  /** null when the listing doesn't say. */
  paid: boolean | null;
  events: DirectoryEvent[];
  /** The Orion program with live countdowns, when this is one of them. */
  programKey: string | null;
}

export interface ProgramDirectory {
  programs: DirectoryProgram[];
  /** Dated events that don't belong to a listed program (e.g. a university Summer of Code). */
  otherEvents: DirectoryEvent[];
}

/** Orion's tracked programs, by the names and acronyms the list uses. */
const TRACKED: Array<[pattern: RegExp, key: string]> = [
  [/\bGSoC\b|Google Summer of Code/i, 'gsoc'],
  [/\bGSSoC\b|GirlScript Summer of Code/i, 'gssoc'],
  [/Hacktoberfest/i, 'hacktoberfest'],
  [/MLH Fellowship/i, 'mlh-fellowship'],
  [/Outreachy/i, 'outreachy'],
  [/\bLFX\b/i, 'lfx-mentorship'],
  [/\bSWoC\b|Social Winter of Code/i, 'swoc'],
  [/24 Pull Requests/i, '24pullrequests'],
];

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Markdown and decoration out of a table cell. */
function clean(cell: string): string {
  return cell
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/[​-‍⁠﻿]/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map(cell => cell.trim());
}

const isSeparator = (line: string) => /^\|?\s*:?-{3,}/.test(line.trim()) && !/[a-z]/i.test(line);

/** "Jan 14" or "Jan 7-20" in a given year; vaguer ("Apr-May", "Dec") gives null. */
export function parseEventDate(value: string, year: number): Pick<DirectoryEvent, 'date' | 'endDate'> | null {
  const match = /^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?$/.exec(clean(value));
  if (!match) return null;
  const month = MONTHS.indexOf(match[1].slice(0, 3).toLowerCase());
  if (month < 0) return null;
  const iso = (day: number) => new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
  return { date: iso(Number(match[2])), ...(match[3] && { endDate: iso(Number(match[3])) }) };
}

/** "Google Summer of Code (GSoC)" → GSoC; "LFX Mentorship" → LFX. */
function acronymOf(name: string): string | null {
  return /\(([A-Z][A-Za-z0-9]{1,9})\)/.exec(name)?.[1] ?? /^([A-Z0-9]{3,8})\s/.exec(name)?.[1] ?? null;
}

function paidFrom(reward: string): boolean | null {
  if (/\bunpaid\b|non-paid|no stipend|\bfree\b/i.test(reward)) return false;
  if (/[$₹€£]|stipend|\bpaid\b|grant|bitcoin/i.test(reward)) return true;
  return null;
}

/** Does an event like "GSoC 2026 Contributor Applications Open" belong to this program? */
function mentions(event: string, program: Pick<DirectoryProgram, 'name' | 'acronym'>): boolean {
  const base = program.name.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  if (base.length > 3 && event.toLowerCase().includes(base.toLowerCase())) return true;
  return program.acronym ? new RegExp(`\\b${program.acronym}\\b`, 'i').test(event) : false;
}

export function parseDirectory(markdown: string): ProgramDirectory {
  const programs: DirectoryProgram[] = [];
  const events: DirectoryEvent[] = [];
  const lines = markdown.split(/\r?\n/);
  let headingYear: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) {
      const year = /\b(20\d{2})\b/.exec(heading[1]);
      headingYear = year ? Number(year[1]) : null;
      continue;
    }
    if (!line.trim().startsWith('|') || !isSeparator(lines[i + 1] ?? '')) continue;

    // A table: header, separator, rows.
    const header = cells(line).map(cell => clean(cell).toLowerCase());
    const rows: string[][] = [];
    for (i += 2; i < lines.length && lines[i].trim().startsWith('|'); i++) rows.push(cells(lines[i]));
    i--;

    const column = (name: string) => header.findIndex(cell => cell.includes(name));
    const first = header[0];
    if ((first === 'program' || first === 'competition') && column('timeline') > 0) {
      const reward = Math.max(column('stipend'), column('prize'), column('reward'));
      for (const row of rows) {
        const link = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/.exec(row[0] ?? '');
        if (!link) continue;
        const name = clean(link[1]);
        const rewardText = reward >= 0 ? clean(row[reward] ?? '') : '';
        programs.push({
          name,
          acronym: acronymOf(name),
          url: link[2],
          organization: column('organization') >= 0 ? clean(row[column('organization')] ?? '') : '',
          timeline: clean(row[column('timeline')] ?? ''),
          reward: rewardText,
          eligibility: column('eligibility') >= 0 ? clean(row[column('eligibility')] ?? '') : '',
          kind: first === 'program' ? 'fellowship' : 'challenge',
          paid: paidFrom(rewardText),
          events: [],
          programKey: TRACKED.find(([pattern]) => pattern.test(name))?.[1] ?? null,
        });
      }
    } else if (first === 'date' && header[1] === 'event' && headingYear) {
      for (const [when, what] of rows) {
        const date = parseEventDate(when ?? '', headingYear);
        const label = clean(what ?? '')
          .replace(/\s*\((approx\.?|varies[^)]*)\)/gi, '')
          .trim();
        if (!date || !label) continue;
        if (!events.some(e => e.date === date.date && e.label.toLowerCase() === label.toLowerCase())) {
          events.push({ ...date, label });
        }
      }
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  const otherEvents: DirectoryEvent[] = [];
  for (const event of events) {
    const owner = programs.find(program => mentions(event.label, program));
    // The list repeats its timeline with different wording; one event per day is enough.
    if (owner) {
      if (!owner.events.some(e => e.date === event.date)) owner.events.push(event);
    } else otherEvents.push(event);
  }

  // Keep the first listing of a program that appears twice.
  const seen = new Set<string>();
  return {
    programs: programs.filter(p => {
      const key = p.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
    otherEvents,
  };
}

/** Raw files skip the GitHub API and its rate limit; the API is the fallback if the file moves. */
async function readme(): Promise<string> {
  for (const name of ['Readme.md', 'README.md']) {
    try {
      const response = await fetch(`https://raw.githubusercontent.com/${DIRECTORY_REPO}/HEAD/${name}`, {
        next: { revalidate: 21600 },
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) return await response.text();
    } catch {
      // try the next name
    }
  }
  return getReadmeMarkdown(DIRECTORY_REPO, 21600);
}

/** The community directory, refreshed every six hours; empty when GitHub can't be reached. */
export async function getProgramDirectory(): Promise<ProgramDirectory> {
  try {
    return parseDirectory(await readme());
  } catch {
    return { programs: [], otherEvents: [] };
  }
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Short name for a countdown card: the acronym, or the name when it is short. */
function shortNameOf(program: DirectoryProgram): string {
  if (program.acronym) return program.acronym;
  const base = program.name.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  if (base.length <= 16) return base;
  return base
    .split(/\s+/)
    .filter(word => /^[A-Z]/.test(word))
    .map(word => word[0])
    .join('');
}

/**
 * Programs Orion doesn't track yet, turned into schedules when the community
 * list gives them a start and an end (e.g. Season of KDE's work period), so
 * they get countdowns and pages like the built-in programs.
 */
export function discoveredSchedules(directory: ProgramDirectory): Record<string, Record<number, OfficialSchedule>> {
  const result: Record<string, Record<number, OfficialSchedule>> = {};
  for (const program of directory.programs) {
    if (program.programKey || program.events.length === 0) continue;
    let start: string | undefined;
    let end: string | undefined;
    let applicationStart: string | undefined;
    let applicationDeadline: string | undefined;
    for (const event of program.events) {
      const label = event.label.toLowerCase();
      if (event.endDate && !start && !end) {
        start = event.date;
        end = event.endDate;
      } else if (/\b(deadline|due|closes?)\b/.test(label)) applicationDeadline = event.date;
      else if (/\b(applications?|registrations?)\b.*\bopens?\b/.test(label)) applicationStart = event.date;
      else if (/\b(ends?|ended|concludes?)\b/.test(label)) end = event.date;
      else if (/\b(begins?|starts?|kicks? ?off)\b/.test(label)) start = event.date;
    }
    if (!start || !end || start > end) continue;
    const kind: DirectoryProgram['kind'] = program.kind;
    result[`dir-${slugify(program.name)}`] = {
      [Number(start.slice(0, 4))]: {
        applicationStart: applicationStart && applicationStart <= start ? applicationStart : undefined,
        applicationDeadline: applicationDeadline && applicationDeadline <= start ? applicationDeadline : undefined,
        contributionStart: start,
        contributionEnd: end,
        source: DIRECTORY_URL,
        kind: 'community',
        program: {
          shortName: shortNameOf(program),
          name: program.name.replace(/\s*\([^)]*\)\s*/g, ' ').trim(),
          description: `${kind === 'challenge' ? 'A contribution event' : 'A mentorship program'}${
            program.organization ? ` run by ${program.organization}` : ''
          }.${program.eligibility ? ` Open to: ${program.eligibility}.` : ''}`,
          website: program.url,
          organizer: program.organization || 'Community',
          type: kind === 'challenge' ? 'fest' : 'mentorship',
          isPaid: program.paid === true,
          stipendNote: program.reward || undefined,
        },
      },
    };
  }
  return result;
}
