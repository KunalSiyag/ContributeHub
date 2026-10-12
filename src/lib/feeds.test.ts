import { describe, expect, it } from 'vitest';
import { icsCalendar } from './ics';
import { readWatchlistParams, watchlistQuery, watchlistSearch } from './watchlist';

describe('calendar feed', () => {
  const ics = icsCalendar(
    'Orion · deadlines',
    [
      {
        uid: 'gsoc-2027-applications-open@orion',
        date: '2027-03-16',
        title: 'GSoC: Applications open',
        description: 'Google Summer of Code 2027, with commas; and semicolons\nhttps://example.com/events/gsoc-2027-a-very-long-slug-that-forces-the-line-to-fold-over',
        url: 'https://example.com/events/gsoc-2027',
      },
    ],
    new Date('2026-10-11T12:00:00Z')
  );

  it('writes all-day events with stable ids', () => {
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('UID:gsoc-2027-applications-open@orion');
    expect(ics).toContain('DTSTART;VALUE=DATE:20270316');
    expect(ics).toContain('DTEND;VALUE=DATE:20270317');
    expect(ics).toContain('DTSTAMP:20261011T120000Z');
    expect(ics).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT12H');
  });

  it('escapes text and folds long lines', () => {
    expect(ics).toContain('2027\\, with commas\\; and semicolons');
    expect(ics.split('\r\n').every(line => new TextEncoder().encode(line).length <= 75)).toBe(true);
    expect(ics).toMatch(/\r\n [^\r\n]/);
  });
});

describe('issue watchlist', () => {
  it('reads and cleans parameters', () => {
    const params = readWatchlistParams(
      new URLSearchParams('repos=zulip/zulip, bad repo ,zulip/zulip,vercel/next.js&labels=good first issue,x"y&unassigned=1')
    );
    expect(params).toEqual({ repos: ['zulip/zulip', 'vercel/next.js'], labels: ['good first issue'], unassigned: true });
  });

  it('builds one search across repositories', () => {
    const params = { repos: ['zulip/zulip', 'vercel/next.js'], labels: ['good first issue'], unassigned: true };
    expect(watchlistQuery(params)).toBe('repo:zulip/zulip repo:vercel/next.js is:issue is:open label:"good first issue" no:assignee');
    expect(watchlistSearch(params)).toBe('repos=zulip%2Fzulip%2Cvercel%2Fnext.js&labels=good+first+issue&unassigned=1');
  });
});
