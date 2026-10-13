import { NextRequest, NextResponse } from 'next/server';
import { getAllEvents, getUpcomingDeadlines } from '@/lib/events';
import { getOfficialSchedules } from '@/lib/programs.server';

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get('status');

  const now = new Date();
  const official = await getOfficialSchedules();
  let events = getAllEvents(now, official);
  if (status === 'active' || status === 'upcoming' || status === 'ended') {
    events = events.filter(e => e.status === status);
  }

  const deadlines = getUpcomingDeadlines(45, now, official);

  return NextResponse.json(
    {
      events: events.map(e => ({
        id: e.id,
        slug: e.slug,
        name: e.name,
        shortName: e.shortName,
        organizer: e.organizer,
        website: e.website,
        description: e.description,
        status: e.status,
        phase: e.phase,
        editionYear: e.editionYear,
        applicationStart: e.applicationStart ?? null,
        applicationDeadline: e.applicationDeadline ?? null,
        programStart: e.contributionStart,
        programEnd: e.contributionEnd,
        nextDeadline: e.nextDeadline ?? null,
        isPaid: e.isPaid,
        stipendNote: e.stipendNote ?? null,
        cohortsNote: e.cohortsNote ?? null,
        officialSource: e.officialSource ?? null,
        milestones: e.milestones ?? [],
      })),
      closingSoon: deadlines.map(d => ({
        eventSlug: d.event.slug,
        eventName: d.event.name,
        label: d.deadline.label,
        date: d.deadline.date,
      })),
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  );
}
