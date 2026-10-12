import { describe, expect, it } from 'vitest';
import { getAllEvents, getEventBySlug, type OfficialSchedules } from './events';
import { MLH_APPLY, parseGssocMilestones, parseMlhTerms, parseSwocDates } from './program-sites';
import { discoveredSchedules, parseDirectory } from './program-directory';
import { datesBasis } from './program-display';

describe('Social Winter of Code site', () => {
  const html = `<section class="band" id="dates"><div class="perks">
    <div class="perk"><h4 style="font-family: var(--mono)">20 Aug 2026</h4><p>Registrations open</p></div>
    <div class="perk"><h4>31 Dec 2026</h4><p>Registrations close</p></div>
    <div class="perk"><h4>1 Jan 2027</h4><p>Programme starts</p></div>
    <div class="perk"><h4>30 Mar 2027</h4><p>Programme ends</p></div>
  </div></section>`;

  it('reads the key dates', () => {
    expect(parseSwocDates(html)).toEqual({
      year: 2027,
      schedule: {
        applicationStart: '2026-08-20',
        applicationDeadline: '2026-12-31',
        contributionStart: '2027-01-01',
        contributionEnd: '2027-03-30',
        source: 'https://swoc.in/#dates',
      },
    });
  });

  it('gives up without the dates section', () => {
    expect(parseSwocDates('<section id="about"></section>')).toBeNull();
  });
});

describe('GirlScript Summer of Code site', () => {
  const html = `<div>Timeline What &amp; When Key milestones for GirlScript Summer of Code 2026
    <span>01</span> <h4>24th March 2026</h4> <p>Launch Event + Applications Open</p>
    <span>02</span> <h4>End of March / Early April 2026</h4> <p>Selections</p>
    <span>04</span> <h4>May to June 2026</h4> <p>Contribution Period</p>
    <span>05</span> <h4>June to July 2026</h4> <p>Final Evaluations and Results</p></div>`;

  it('reads the application day and the contribution months', () => {
    expect(parseGssocMilestones(html)).toEqual({
      year: 2026,
      schedule: {
        applicationStart: '2026-03-24',
        contributionStart: '2026-05-01',
        contributionEnd: '2026-06-30',
        source: 'https://gssoc.girlscript.tech',
      },
    });
  });
});

describe('MLH Fellowship application form', () => {
  const fall = `<div class="htmlSection"><b>Upcoming Terms and Deadlines</b><br><b>Fall 2026 Software Engineering:</b> Starts September 14th, 2026<br>
    Deadline for Applicants from all regions: August 31, 2026</div><p>The application takes approximately 30-45 minutes to complete.</p>
    <select><optgroup label="Software Engineering"><option value="a">Fall 2026 (September 14 - December 4, 2026)</option></optgroup>
    <optgroup label="Web3 Engineering"><option value="b">Fall 2026 (September 14 - December 4, 2026)</option></optgroup></select>`;

  it('reads each term once, with its deadline', () => {
    expect(parseMlhTerms(fall)).toEqual({
      2026: [
        {
          cohort: 'Fall Cohort',
          applicationDeadline: '2026-08-31',
          contributionStart: '2026-09-14',
          contributionEnd: '2026-12-04',
          source: MLH_APPLY,
        },
      ],
    });
  });

  it('keeps regional deadlines and terms that start the year before they end', () => {
    const spring = `Upcoming Terms and Deadlines Spring 2027 Software Engineering: Starts January 11th, 2027
      Deadline for Applicants from APAC: December 1, 2026 Deadline for Applicants from all other regions: December 14, 2026
      Eligibility Check <option>Spring 2027 (January 11 - April 2, 2027)</option> <option>Fall 2027 (December 6 - March 3, 2028)</option>`;
    const terms = parseMlhTerms(spring)!;
    expect(terms[2027]).toEqual([
      {
        cohort: 'Spring Cohort',
        applicationDeadline: '2026-12-14',
        contributionStart: '2027-01-11',
        contributionEnd: '2027-04-02',
        source: MLH_APPLY,
        milestones: [
          { label: 'Applications close (APAC)', date: '2026-12-01' },
          { label: 'Applications close (all other regions)', date: '2026-12-14' },
        ],
      },
      { cohort: 'Fall Cohort', contributionStart: '2027-12-06', contributionEnd: '2028-03-03', source: MLH_APPLY },
    ]);
  });

  it('gives up on a page without terms', () => {
    expect(parseMlhTerms('<p>Applications are closed.</p>')).toBeNull();
  });

  it('replaces the usual cohort dates with the published ones', () => {
    const official: OfficialSchedules = { 'mlh-fellowship': parseMlhTerms(fall)! };
    const event = getEventBySlug('mlh-fellowship-2026-fall-cohort', new Date('2026-10-12T12:00:00Z'), official)!;
    expect(event).toMatchObject({
      applicationDeadline: '2026-08-31',
      contributionStart: '2026-09-14',
      contributionEnd: '2026-12-04',
      officialSource: MLH_APPLY,
      phase: 'running',
    });
    expect(datesBasis(event).kind).toBe('official');
  });
});

describe('editions not announced yet', () => {
  const official: OfficialSchedules = {
    gssoc: { 2026: { applicationStart: '2026-03-24', contributionStart: '2026-05-01', contributionEnd: '2026-06-30', source: 'https://gssoc.girlscript.tech' } },
  };

  it('repeat last year’s published dates, labelled as expected', () => {
    const next = getEventBySlug('gssoc-2027', new Date('2026-10-12T12:00:00Z'), official)!;
    expect(next).toMatchObject({ applicationStart: '2027-03-24', contributionStart: '2027-05-01', contributionEnd: '2027-06-30' });
    expect(next.officialSource).toBeUndefined();
    expect(next.projectedFrom).toEqual({ year: 2026, source: 'https://gssoc.girlscript.tech', community: false });
    expect(datesBasis(next)).toMatchObject({ kind: 'expected', badge: 'Expected dates' });
  });

  it('only look one year back', () => {
    expect(getEventBySlug('gssoc-2028', new Date('2027-10-12T12:00:00Z'), official)?.projectedFrom).toBeUndefined();
  });
});

describe('programs discovered in the community list', () => {
  const markdown = `
| Program | Organization | Timeline | Stipend | Eligibility |
|---|---|---|---|---|
| [**Season of KDE**](https://season.kde.org/) | KDE Community | Applications due Jan 14 | Non-paid (certificate + swag) | Students |
| [**Djangonaut Space**](https://djangonaut.space/) | Django Community | Multiple sessions | Free / mentorship-based | Django contributors |

### January 2026

| Date | Event |
| --- | --- |
| Jan 14 | Season of KDE 2026 Application Deadline |
| Jan 23 | Season of KDE 2026 Work Begins |

### March 2026

| Date | Event |
| --- | --- |
| Mar 20 | Season of KDE 2026 Work Ends |
`;
  const schedules = discoveredSchedules(parseDirectory(markdown));

  it('become schedules when the list gives a start and an end', () => {
    expect(Object.keys(schedules)).toEqual(['dir-season-of-kde']);
    expect(schedules['dir-season-of-kde'][2026]).toMatchObject({
      applicationDeadline: '2026-01-14',
      contributionStart: '2026-01-23',
      contributionEnd: '2026-03-20',
      kind: 'community',
      program: { shortName: 'Season of KDE', organizer: 'KDE Community', isPaid: false, type: 'mentorship' },
    });
  });

  it('get countdowns and pages like built-in programs', () => {
    const now = new Date('2026-10-12T12:00:00Z');
    const sok = getAllEvents(now, schedules).find(event => event.programKey === 'dir-season-of-kde')!;
    expect(sok.slug).toBe('dir-season-of-kde-2027');
    expect(sok.name).toBe('Season of KDE 2027');
    // Only a deadline is known for the application window: it is the next date.
    expect(sok.nextDeadline).toEqual({ label: 'Application deadline', date: '2027-01-14' });
    expect(datesBasis(sok)).toMatchObject({ kind: 'expected' });
    const past = getEventBySlug('dir-season-of-kde-2026', now, schedules)!;
    expect(past.communitySource).toBe('https://github.com/yashisrani/List-of-OpenSource-Programs');
    expect(datesBasis(past)).toMatchObject({ kind: 'community', badge: 'Community dates' });
  });
});
