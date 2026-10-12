import { describe, it, expect } from 'vitest';
import { buildCalendarLinks } from '@/lib/events';

describe('buildCalendarLinks', () => {
  const links = buildCalendarLinks(
    'GSoC 2026 — Program ends',
    '2026-08-24',
    'Details with, comma and\nnewline'
  );

  it('builds a Google Calendar URL with correct all-day dates', () => {
    expect(links.googleUrl).toContain('https://calendar.google.com/calendar/render');
    expect(links.googleUrl).toContain('action=TEMPLATE');
    expect(links.googleUrl).toContain('dates=20260824%2F20260825');
    expect(links.googleUrl).toContain('text=GSoC+2026');
  });

  it('produces a downloadable ICS payload with escaped text', () => {
    const ics = decodeURIComponent(links.icsDataUri.split(',')[1]);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260824');
    expect(ics).toContain('DTEND;VALUE=DATE:20260825');
    expect(ics).toContain('SUMMARY:GSoC 2026 — Program ends');
    expect(ics).toContain('Details with\\, comma and\\nnewline');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('includes location when provided', () => {
    const withLocation = buildCalendarLinks('T', '2026-01-01', 'D', 'Remote');
    const ics = decodeURIComponent(withLocation.icsDataUri.split(',')[1]);
    expect(ics).toContain('LOCATION:Remote');
  });

  it('handles month rollover for end dates', () => {
    const rolled = buildCalendarLinks('Hacktoberfest ends', '2026-10-31', '');
    expect(rolled.googleUrl).toContain('dates=20261031%2F20261101');
  });
});
