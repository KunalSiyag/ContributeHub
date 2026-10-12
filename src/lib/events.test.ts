import { describe, it, expect } from 'vitest';
import {
  getAllEvents,
  getEventBySlug,
  getCurrentEditionForProgram,
  getUpcomingDeadlines,
  getEditionsInRange,
  getCohortLabel,
  daysUntil,
  resolveCurrentEdition,
  PROGRAM_TEMPLATES_FOR_TESTING,
} from '@/lib/events';

const AUG_22_2026 = new Date('2026-08-22T12:00:00Z');

describe('events engine', () => {
  it('exposes all programs with computed metadata', () => {
    const events = getAllEvents(AUG_22_2026);
    expect(events.length).toBeGreaterThanOrEqual(8);
    for (const e of events) {
      expect(e.status).toMatch(/^(upcoming|active|ended)$/);
      expect(e.phase).toBeTruthy();
      expect(e.editionYear).toBeGreaterThanOrEqual(2026);
      if (e.status !== 'ended') expect(e.nextDeadline).toBeTruthy();
    }
  });

  it('marks GSoC as running on Aug 22, 2026 (ends Aug 24)', () => {
    const gsoc = getAllEvents(AUG_22_2026).find(e => e.shortName === 'GSoC');
    expect(gsoc?.status).toBe('active');
    expect(gsoc?.phase).toBe('running');
    expect(gsoc?.contributionEnd).toBe('2026-08-24');
    expect(gsoc?.nextDeadline?.label).toBe('Program ends');
  });

  it('rolls GSSoC forward to the next edition after June', () => {
    const gssoc = getAllEvents(AUG_22_2026).find(e => e.shortName === 'GSSoC');
    expect(gssoc?.editionYear).toBe(2027);
    expect(gssoc?.status).toBe('upcoming');
    expect(gssoc?.contributionStart).toBe('2027-03-10');
  });

  it('keeps Hacktoberfest running mid-October with end-of-month deadline', () => {
    const hack = getAllEvents(new Date('2026-10-15T00:00:00Z')).find(e => e.slug.startsWith('hacktoberfest'));
    expect(hack?.status).toBe('active');
    expect(hack?.nextDeadline).toEqual({ label: 'Program ends', date: '2026-10-31' });
  });

  it('shows applications-open phase inside the application window (Hacktoberfest late Sept)', () => {
    const hack = getAllEvents(new Date('2026-09-28T00:00:00Z')).find(e => e.slug.startsWith('hacktoberfest'));
    expect(hack?.phase).toBe('applications-open');
    expect(hack?.applicationDeadline).toBe('2026-10-31');
    expect(hack?.nextDeadline?.label).toBe('Application deadline');
  });

  it('picks the nearest MLH cohort (Fall running in late September)', () => {
    const mlh = getAllEvents(new Date('2026-09-20T00:00:00Z')).find(e => e.shortName === 'MLH');
    expect(mlh?.slug).toBe('mlh-fellowship-2026-fall-cohort');
    expect(mlh?.status).toBe('active');
  });

  it('resolves LFX spring-term application window in early February', () => {
    const lfx = getAllEvents(new Date('2027-02-01T00:00:00Z')).find(e => e.shortName === 'LFX');
    expect(lfx?.slug).toBe('lfx-mentorship-2027-spring-term');
    expect(lfx?.phase).toBe('applications-open');
    expect(lfx?.applicationDeadline).toBe('2027-02-21');
  });

  it('switches Outreachy to the December cohort with applications closed by November', () => {
    const out = getAllEvents(new Date('2026-11-01T00:00:00Z')).find(e => e.shortName === 'Outreachy');
    expect(out?.slug).toBe('outreachy-2026-december-cohort');
    expect(out?.phase).toBe('applications-closed');
    expect(out?.nextDeadline).toEqual({ label: 'Program starts', date: '2026-12-01' });
  });

  it('finds an event by slug and includes deadlines', () => {
    const event = getEventBySlug('gsoc-2026', AUG_22_2026);
    expect(event).toBeTruthy();
    expect(event?.applicationDeadline).toBe('2026-04-08');
  });

  it('keeps past-edition slugs resolvable after the program rolls over', () => {
    const later = new Date('2026-10-10T00:00:00Z');
    const past = getEventBySlug('gsoc-2026', later);
    expect(past?.slug).toBe('gsoc-2026');
    expect(past?.status).toBe('ended');
    expect(getEventBySlug('outreachy-2026-december-cohort', later)?.contributionEnd).toBe('2027-03-14');
  });

  it('maps a bare program key to its current edition', () => {
    expect(getCurrentEditionForProgram('gsoc', new Date('2026-10-10T00:00:00Z'))?.slug).toBe('gsoc-2027');
    expect(getCurrentEditionForProgram('nope')).toBeUndefined();
  });

  it('returns undefined for unknown slugs', () => {
    expect(getEventBySlug('nope-1999', AUG_22_2026)).toBeUndefined();
    expect(getEventBySlug('gsoc-1999', AUG_22_2026)).toBeUndefined();
    expect(getEventBySlug('mlh-fellowship-2026-winter-cohort', AUG_22_2026)).toBeUndefined();
  });

  it('puts the MLH Spring deadline in the December before the cohort starts', () => {
    const spring = getEventBySlug('mlh-fellowship-2027-spring-cohort', new Date('2026-12-01T00:00:00Z'));
    expect(spring?.applicationStart).toBe('2026-11-01');
    expect(spring?.applicationDeadline).toBe('2026-12-15');

    // After the Fall cohort ends, Spring is current and its window has closed.
    const later = getAllEvents(new Date('2026-12-20T00:00:00Z')).find(e => e.shortName === 'MLH');
    expect(later?.slug).toBe('mlh-fellowship-2027-spring-cohort');
    expect(later?.phase).toBe('applications-closed');
    expect(later?.nextDeadline).toEqual({ label: 'Program starts', date: '2027-01-12' });
  });

  it('keeps the December Outreachy cohort active in early January', () => {
    const out = getAllEvents(new Date('2027-01-10T00:00:00Z')).find(e => e.shortName === 'Outreachy');
    expect(out?.slug).toBe('outreachy-2026-december-cohort');
    expect(out?.status).toBe('active');
  });

  it('sorts upcoming deadlines chronologically within the window', () => {
    const deadlines = getUpcomingDeadlines(45, AUG_22_2026);
    const dates = deadlines.map(d => d.deadline.date);
    expect(dates).toEqual([...dates].sort());
    expect(dates[0]).toBe('2026-08-24');
    expect(deadlines.length).toBeGreaterThan(0);
  });
});

describe('date helpers', () => {
  it('computes whole-day differences across months', () => {
    expect(daysUntil('2026-08-24', AUG_22_2026)).toBe(2);
    expect(daysUntil('2026-09-26', AUG_22_2026)).toBe(35);
    expect(daysUntil('2026-08-22', AUG_22_2026)).toBe(0);
    expect(daysUntil('2026-08-21', AUG_22_2026)).toBe(-1);
  });
});

describe('resolveCurrentEdition', () => {
  it('prefers a running cohort over later ones', () => {
    const mlh = PROGRAM_TEMPLATES_FOR_TESTING.find(t => t.key === 'mlh-fellowship')!;
    const edition = resolveCurrentEdition(mlh, new Date('2026-07-01T00:00:00Z'));
    expect(edition.cohortLabel).toBe('Summer Cohort');
  });

  it('falls back to next year when every cohort of this year has ended', () => {
    const swoc = PROGRAM_TEMPLATES_FOR_TESTING.find(t => t.key === 'swoc')!;
    const edition = resolveCurrentEdition(swoc, new Date('2026-06-01T00:00:00Z'));
    expect(edition.year).toBe(2027);
    expect(edition.contributionStart).toBe('2027-01-15');
  });
});

describe('getEditionsInRange', () => {
  const OCT_10_2026 = new Date('2026-10-10T12:00:00Z');
  const editions = getEditionsInRange('2026-10-01', '2027-09-30', OCT_10_2026);
  const slugsFor = (key: string) => editions.filter(e => e.programKey === key).map(e => e.slug);

  it('lists every cohort that overlaps the range, in program then date order', () => {
    expect(slugsFor('mlh-fellowship')).toEqual([
      'mlh-fellowship-2026-fall-cohort',
      'mlh-fellowship-2027-spring-cohort',
      'mlh-fellowship-2027-summer-cohort',
      'mlh-fellowship-2027-fall-cohort',
    ]);
    expect(slugsFor('outreachy')).toEqual([
      'outreachy-2026-december-cohort',
      'outreachy-2027-may-cohort',
      'outreachy-2027-december-cohort',
    ]);
    const programOrder = Array.from(new Set(editions.map(e => e.programKey)));
    expect(programOrder).toEqual(getAllEvents(OCT_10_2026).map(e => e.programKey));
  });

  it('includes editions that only touch the range through their application window', () => {
    // Hacktoberfest 2027 registration opens Sep 26, before its October program.
    expect(slugsFor('hacktoberfest')).toEqual(['hacktoberfest-2026', 'hacktoberfest-2027']);
    expect(slugsFor('gsoc')).toEqual(['gsoc-2027']);
  });

  it('excludes editions entirely outside the range', () => {
    const winter = getEditionsInRange('2027-01-01', '2027-02-28', OCT_10_2026);
    expect(winter.some(e => e.programKey === '24pullrequests')).toBe(false);
    expect(winter.some(e => e.slug === 'gsoc-2027')).toBe(false);
    expect(winter.some(e => e.slug === 'swoc-2027')).toBe(true);
  });

  it('computes phases relative to now', () => {
    const find = (slug: string) => editions.find(e => e.slug === slug);
    expect(find('hacktoberfest-2026')?.phase).toBe('running');
    expect(find('outreachy-2026-december-cohort')?.phase).toBe('applications-closed');
    expect(find('gsoc-2027')?.phase).toBe('pre-announcement');
  });

  it('keeps application windows before the program they feed', () => {
    for (const e of editions) {
      if (e.applicationStart && e.applicationDeadline) {
        expect(e.applicationStart <= e.applicationDeadline).toBe(true);
        expect(e.applicationDeadline <= e.contributionEnd).toBe(true);
      }
    }
    const spring = editions.find(e => e.slug === 'mlh-fellowship-2027-spring-cohort');
    expect(spring?.applicationStart).toBe('2026-11-01');
    expect(spring?.applicationDeadline).toBe('2026-12-15');
  });
});

describe('getCohortLabel', () => {
  const OCT_10_2026 = new Date('2026-10-10T12:00:00Z');

  it('returns the cohort label for multi-cohort editions', () => {
    expect(getCohortLabel(getEventBySlug('mlh-fellowship-2026-fall-cohort', OCT_10_2026)!)).toBe('Fall Cohort');
    expect(getCohortLabel(getEventBySlug('lfx-mentorship-2027-spring-term', OCT_10_2026)!)).toBe('Spring Term');
    expect(getCohortLabel(getEventBySlug('outreachy-2026-december-cohort', OCT_10_2026)!)).toBe('December Cohort');
  });

  it('returns undefined for single-cohort programs and unknown keys', () => {
    expect(getCohortLabel(getEventBySlug('gsoc-2027', OCT_10_2026)!)).toBeUndefined();
    expect(getCohortLabel({ slug: 'nope-2026-x', programKey: 'nope', editionYear: 2026 })).toBeUndefined();
  });
});
