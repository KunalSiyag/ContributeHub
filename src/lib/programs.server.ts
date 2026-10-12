import 'server-only';
import type { EventDeadline } from '@/types';
import type { OfficialSchedule, OfficialSchedules } from './events';
import { GSOC_SITE, getGsocPrograms, type GsocProgram } from './gsoc';
import { getLfxProjects, lfxSchedules } from './lfx';
import { getOutreachyRound } from './outreachy';
import { discoveredSchedules, getProgramDirectory } from './program-directory';
import { getGssocSchedule, getMlhSchedules, getSwocSchedule } from './program-sites';

const day = (iso: string | undefined) => (iso ? iso.slice(0, 10) : undefined);

/** Program-wide milestones only; evaluation milestones repeat per project size. */
function milestone(program: GsocProgram, name: string): string | undefined {
  return day(program.milestones.find(m => m.name === name && !m.projectSize)?.date);
}

/** Announcements contributors wait for, beyond the application and coding windows. */
const GSOC_ANNOUNCEMENTS: Array<[name: string, label: string]> = [
  ['org_announce_public', 'Accepted organizations announced'],
  ['project_announce_public', 'Accepted projects announced'],
];

export function gsocSchedule(program: GsocProgram): OfficialSchedule | null {
  const contributionStart = milestone(program, 'project_work_start');
  const contributionEnd = milestone(program, 'program_end');
  if (!contributionStart || !contributionEnd) return null;
  const milestones = GSOC_ANNOUNCEMENTS.map(([name, label]) => ({ label, date: milestone(program, name) })).filter(
    (m): m is EventDeadline => Boolean(m.date)
  );
  return {
    applicationStart: milestone(program, 'contributor_proposals_open'),
    applicationDeadline: milestone(program, 'proposal_deadline'),
    contributionStart,
    contributionEnd,
    source: `${GSOC_SITE}/programs/${program.year}`,
    ...(milestones.length > 0 && { milestones }),
  };
}

/**
 * Dates programs publish themselves, for every edition they have announced:
 * Google Summer of Code (Google's program API), LFX Mentorship (its project
 * index), Outreachy (its published round schedule), Social Winter of Code,
 * GirlScript Summer of Code (their sites) and the MLH Fellowship (the terms on
 * its application form). Programs in the community list
 * with dates join as discovered programs. Any source that is unreachable
 * leaves the calendar rules in place; next year's editions repeat this year's
 * published dates until the program announces new ones.
 */
export async function getOfficialSchedules(): Promise<OfficialSchedules> {
  const [gsocPrograms, lfxProjects, outreachy, swoc, gssoc, mlh, directory] = await Promise.all([
    getGsocPrograms(),
    getLfxProjects(),
    getOutreachyRound(),
    getSwocSchedule(),
    getGssocSchedule(),
    getMlhSchedules(),
    getProgramDirectory(),
  ]);

  const gsoc: Record<number, OfficialSchedule> = {};
  for (const program of gsocPrograms) {
    const schedule = gsocSchedule(program);
    if (schedule) gsoc[program.year] = schedule;
  }

  return {
    ...discoveredSchedules(directory),
    gsoc,
    'lfx-mentorship': lfxSchedules(lfxProjects),
    outreachy: outreachy ? { [outreachy.year]: [outreachy.schedule] } : {},
    swoc: swoc ? { [swoc.year]: swoc.schedule } : {},
    gssoc: gssoc ? { [gssoc.year]: gssoc.schedule } : {},
    'mlh-fellowship': mlh ?? {},
  };
}
