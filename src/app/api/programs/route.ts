import { NextResponse } from 'next/server';
import { getAllEvents } from '@/lib/events';
import { DIRECTORY_URL, getProgramDirectory } from '@/lib/program-directory';
import { datesBasis } from '@/lib/program-display';
import { getOfficialSchedules } from '@/lib/programs.server';

export const revalidate = 3600;

/**
 * GET /api/programs — every program Orion knows: tracked editions with
 * their dates and where those dates come from, then the community directory.
 * Public and CORS-open, for anyone building on the same data.
 */
export async function GET() {
  const now = new Date();
  const [official, directory] = await Promise.all([getOfficialSchedules(), getProgramDirectory()]);

  return NextResponse.json(
    {
      generatedAt: now.toISOString(),
      tracked: getAllEvents(now, official).map(e => ({
        slug: e.slug,
        program: e.programKey,
        name: e.name,
        organizer: e.organizer,
        website: e.website,
        phase: e.phase,
        applicationStart: e.applicationStart ?? null,
        applicationDeadline: e.applicationDeadline ?? null,
        programStart: e.contributionStart,
        programEnd: e.contributionEnd,
        nextDeadline: e.nextDeadline ?? null,
        milestones: e.milestones ?? [],
        dates: { basis: datesBasis(e).kind, url: datesBasis(e).url },
        paid: e.isPaid,
      })),
      directory: {
        source: DIRECTORY_URL,
        license: 'Apache-2.0',
        programs: directory.programs.map(program => ({
          name: program.name,
          url: program.url,
          organization: program.organization,
          timeline: program.timeline,
          reward: program.reward,
          eligibility: program.eligibility,
          kind: program.kind,
          paid: program.paid,
          events: program.events,
          trackedAs: program.programKey,
        })),
      },
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
