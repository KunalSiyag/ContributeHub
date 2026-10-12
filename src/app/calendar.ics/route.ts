import { getAllEvents } from '@/lib/events';
import { icsCalendar, type CalendarEntry } from '@/lib/ics';
import { datesBasis } from '@/lib/program-display';
import { getOfficialSchedules } from '@/lib/programs.server';
import { getSiteUrl } from '@/lib/site';

export const revalidate = 3600;

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * GET /calendar.ics — every tracked program's key dates as a calendar to
 * subscribe to. Calendar apps refresh it, so moved or newly published
 * official dates arrive on their own.
 */
export async function GET() {
  const baseUrl = getSiteUrl();
  const now = new Date();
  const events = getAllEvents(now, await getOfficialSchedules());
  const today = now.toISOString().slice(0, 10);

  const entries: CalendarEntry[] = events.flatMap(event => {
    const url = `${baseUrl}/events/${event.slug}`;
    const source = `${datesBasis(event).sentence} Confirm on ${event.website}.`;
    const dates = [
      event.applicationStart && { label: 'Applications open', date: event.applicationStart },
      event.applicationDeadline && { label: 'Application deadline', date: event.applicationDeadline },
      { label: 'Program starts', date: event.contributionStart },
      { label: 'Program ends', date: event.contributionEnd },
      ...(event.milestones ?? []),
    ].filter((d): d is { label: string; date: string } => Boolean(d));
    return dates
      .filter(d => d.date >= today)
      .map(d => ({
        uid: `${event.slug}-${slugify(d.label)}@orion`,
        date: d.date,
        title: `${event.shortName}: ${d.label}`,
        description: `${event.name}. ${source}\n${url}`,
        url,
      }));
  });

  return new Response(icsCalendar('Orion · Open source program deadlines', entries, now), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="orion-deadlines.ics"',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
