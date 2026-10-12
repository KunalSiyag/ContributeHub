import { describe, expect, it } from 'vitest';
import { getAllEvents, getEventBySlug, getUpcomingDeadlines, type OfficialSchedules } from './events';
import { gsocSchedule } from './programs.server';
import { lfxSchedules, parseLfxProjects, projectsForTerm } from './lfx';
import { parseOutreachySchedule } from './outreachy';
import { parseDirectory, parseEventDate } from './program-directory';
import { githubSlug, orgDeepLinks } from './organizations';
import type { GsocProgram } from './gsoc';

const GSOC_2026: GsocProgram = {
  year: 2026,
  phase: 'project_work',
  active: true,
  orgsAccepted: 184,
  projects: 1156,
  milestones: [
    { name: 'contributor_proposals_open', label: 'Contributor Proposals Open', date: '2026-03-16T18:00:00Z', projectSize: null },
    { name: 'proposal_deadline', label: 'Proposal Deadline', date: '2026-03-31T18:00:00Z', projectSize: null },
    { name: 'project_work_start', label: 'Project Work Period Start', date: '2026-05-25T18:00:00Z', projectSize: null },
    { name: 'program_end', label: 'Program End Date', date: '2026-11-11T18:00:00Z', projectSize: null },
    { name: 'project_completion', label: 'Project Completion (small)', date: '2026-08-31T18:00:00Z', projectSize: 'small' },
  ],
};

describe('gsocSchedule', () => {
  it('maps Google milestones onto an edition', () => {
    expect(gsocSchedule(GSOC_2026)).toEqual({
      applicationStart: '2026-03-16',
      applicationDeadline: '2026-03-31',
      contributionStart: '2026-05-25',
      contributionEnd: '2026-11-11',
      source: 'https://summerofcode.withgoogle.com/programs/2026',
    });
  });

  it('needs the coding period to be published', () => {
    expect(gsocSchedule({ ...GSOC_2026, milestones: GSOC_2026.milestones.slice(0, 2) })).toBeNull();
  });
});

describe('official schedules', () => {
  const official: OfficialSchedules = { gsoc: { 2026: gsocSchedule(GSOC_2026)! } };
  const now = new Date('2026-10-11T12:00:00Z');

  it('replace calendar rules for that edition', () => {
    const gsoc = getAllEvents(now, official).find(event => event.programKey === 'gsoc')!;
    expect(gsoc.slug).toBe('gsoc-2026');
    expect(gsoc.phase).toBe('running');
    expect(gsoc.nextDeadline).toEqual({ label: 'Program ends', date: '2026-11-11' });
    expect(gsoc.officialSource).toBe('https://summerofcode.withgoogle.com/programs/2026');
  });

  it('leave other programs and years on their rules', () => {
    const rules = getAllEvents(now);
    expect(rules.find(event => event.programKey === 'gsoc')?.officialSource).toBeUndefined();
    expect(getEventBySlug('gsoc-2025', now, official)?.officialSource).toBeUndefined();
    expect(getAllEvents(now, official).filter(event => event.officialSource)).toHaveLength(1);
  });

  it('flow into upcoming deadlines', () => {
    const deadline = getUpcomingDeadlines(60, now, official).find(item => item.event.programKey === 'gsoc');
    expect(deadline?.deadline.date).toBe('2026-11-11');
  });
});

describe('GitHub links for organizations', () => {
  it.each([
    ['https://github.com/wagtail/wagtail', 'wagtail/wagtail'],
    ['https://github.com/wagtail/wagtail/', 'wagtail/wagtail'],
    ['https://github.com/zulip/zulip.git', 'zulip/zulip'],
    ['https://github.com/apache', 'apache'],
    ['https://gitlab.com/inkscape/inkscape', null],
    [null, null],
  ])('reads %s', (url, slug) => {
    expect(githubSlug(url)).toBe(slug);
  });

  it('searches a whole organization when there is no repository', () => {
    expect(orgDeepLinks('apache').goodFirstIssuesUrl).toBe(
      `https://github.com/search?type=issues&q=${encodeURIComponent('org:apache is:issue is:open label:"good first issue"')}`
    );
    expect(orgDeepLinks('wagtail/wagtail').goodFirstIssuesUrl).toMatch(/^https:\/\/github\.com\/wagtail\/wagtail\/issues\?q=/);
  });
});

describe('Outreachy round schedule', () => {
  const html = `
<p><b>December 2026 Outreachy internship cohort round schedule</b></p>
<table class="table">
    <tr><td><b>Aug. 24, 2026 at 4pm UTC</b></td><td>Initial applications open</td></tr>
    <tr><td><b>Aug. 31, 2026 at 4pm UTC</b></td><td>Initial application deadline</td></tr>
    <tr><td><b>Oct. 12, 2026 at 4pm UTC</b></td><td>Initial application results available</td></tr>
    <tr><td><b>Oct. 12, 2026 to Nov. 9, 2026</b></td><td>Contribute to projects</td></tr>
    <tr><td><b>Nov. 9, 2026<br> at 4pm UTC</b></td><td>Final application deadline</td></tr>
    <tr><td><b>Dec. 7, 2026<br> to March 8, 2027</b></td><td>Internships period</td></tr>
</table>`;

  it('reads the published round', () => {
    const round = parseOutreachySchedule(html)!;
    expect(round.year).toBe(2026);
    expect(round.cohort).toBe('December Cohort');
    expect(round.schedule).toMatchObject({
      cohort: 'December Cohort',
      applicationStart: '2026-08-24',
      applicationDeadline: '2026-08-31',
      contributionStart: '2026-12-07',
      contributionEnd: '2027-03-08',
    });
    expect(round.schedule.milestones).toEqual([
      { label: 'Initial application results available', date: '2026-10-12' },
      { label: 'Contribution period opens', date: '2026-10-12' },
      { label: 'Final application deadline', date: '2026-11-09' },
    ]);
  });

  it('replaces the December cohort and counts down to the final deadline', () => {
    const round = parseOutreachySchedule(html)!;
    const official: OfficialSchedules = { outreachy: { 2026: [round.schedule] } };
    const outreachy = getEventBySlug('outreachy-2026-december-cohort', new Date('2026-10-20T12:00:00Z'), official)!;
    expect(outreachy.officialSource).toMatch(/^https:\/\/www\.outreachy\.org\//);
    expect(outreachy.contributionStart).toBe('2026-12-07');
    expect(outreachy.nextDeadline).toEqual({ label: 'Final application deadline', date: '2026-11-09' });
    // The May cohort keeps its calendar rules.
    expect(getEventBySlug('outreachy-2026-may-cohort', new Date('2026-10-20T12:00:00Z'), official)?.officialSource).toBeUndefined();
  });

  it('gives up on pages it does not recognise', () => {
    expect(parseOutreachySchedule('<p>Nothing here</p>')).toBeNull();
    expect(parseOutreachySchedule(html.replace('Internships period', 'Something else'))).toBeNull();
  });
});

describe('LFX Mentorship', () => {
  const term = (name: string, appStart: string, appEnd: string, start: string, end: string, active = 'open') => ({
    name,
    active,
    applicationStartDate: Date.parse(appStart) / 1000,
    applicationEndDate: Date.parse(appEnd) / 1000,
    startDateTime: Date.parse(start) / 1000,
    endDateTime: Date.parse(end) / 1000,
  });
  const fall = term('2026 Term 3 (Sep-Nov)', '2026-08-03', '2026-08-18', '2026-09-15', '2026-11-15');
  const project = (id: string, terms: object[], extra: object = {}) => ({
    _source: {
      projectId: id,
      name: `Project ${id}`,
      status: 'Published',
      lfProjectName: 'Cloud Native Computing Foundation (CNCF)',
      logoUrl: 'https://example.com/logo.png',
      apprenticeNeeds: { skills: ['Go', 'Kubernetes'] },
      repoLink: 'https://github.com/example/repo',
      applicationsCount: 12,
      acceptApplications: false,
      programTerms: terms,
      ...extra,
    },
  });
  const raw = {
    hits: {
      hits: [
        project('a', [fall]),
        project('b', [fall], { applicationsCount: 40 }),
        // A stray edit loses the vote.
        project('c', [term('2026 Term 3 (Sep-Nov)', '2026-08-01', '2026-08-20', '2026-09-15', '2026-11-15')]),
        // Application window after the term starts: dropped, term dates kept.
        project('d', [term('2026 Term 1: March - May', '2026-01-23', '2026-06-28', '2026-03-16', '2026-05-16')]),
        project('e', [term('2026 Term 2: Jun-Aug', '2026-05-01', '2026-05-20', '2026-06-15', '2026-08-16', 'deleted')]),
        project('f', [fall], { status: 'Draft' }),
      ],
    },
  };

  it('reads open, published projects', () => {
    const projects = parseLfxProjects(raw);
    expect(projects.map(p => p.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(projects[0]).toMatchObject({
      foundation: 'Cloud Native Computing Foundation (CNCF)',
      skills: ['Go', 'Kubernetes'],
      repo: 'https://github.com/example/repo',
      url: 'https://mentorship.lfx.linuxfoundation.org/project/a',
    });
    expect(projects[4].terms).toEqual([]);
  });

  it('turns term dates into official schedules', () => {
    expect(lfxSchedules(parseLfxProjects(raw))).toEqual({
      2026: [
        {
          cohort: 'Fall Term',
          applicationStart: '2026-08-03',
          applicationDeadline: '2026-08-18',
          contributionStart: '2026-09-15',
          contributionEnd: '2026-11-15',
          source: 'https://mentorship.lfx.linuxfoundation.org',
        },
        {
          cohort: 'Spring Term',
          applicationStart: undefined,
          applicationDeadline: undefined,
          contributionStart: '2026-03-16',
          contributionEnd: '2026-05-16',
          source: 'https://mentorship.lfx.linuxfoundation.org',
        },
      ],
    });
  });

  it('lists the projects of one term, most contested first', () => {
    const projects = parseLfxProjects(raw);
    expect(projectsForTerm(projects, 2026, 'Fall Term').map(p => p.id)).toEqual(['b', 'a', 'c']);
    expect(projectsForTerm(projects, 2027, 'Fall Term')).toEqual([]);
  });
});

describe('community program directory', () => {
  const markdown = `
# Programs

| Program | Organization | Timeline | Stipend | Eligibility |
|---|---|---|---|---|
| [**Google Summer of Code (GSoC)**](https://summerofcode.withgoogle.com/) | Google | **2026:** Coding: May 25 – Nov 2 | **$1,500 – $6,600** | 18+ years |
| [**Season of KDE**](https://season.kde.org/) | KDE Community | Applications due Jan 14 | Non-paid (certificate + swag) | Students |
| [**LFX Mentorship**](https://mentorship.lfx.linuxfoundation.org/) | Linux Foundation | Multiple terms | **$1,000 – $6,600** | Open to all |

| Competition | Organization | Timeline | Prizes/Rewards |
| --- | --- | --- | --- |
| [**Hacktoberfest**](https://hacktoberfest.com/) | DigitalOcean | October 1-31 | Digital badges |

### January 2026

| Date     | Event                                             |
| -------- | ------------------------------------------------- |
| Jan 7-20 | LFX Spring 2026 Project Proposal Window _(approx.)_ |
| Jan 14   | Season of KDE 2026 Application Deadline           |
| Jan 19   | GSoC 2026 Org Applications Open (18:00 UTC)       |

### April-May 2026

| Date    | Event                          |
| ------- | ------------------------------ |
| Apr-May | Something vague                |
| Apr 1   | SSoC 2026 Registration Opens   |

### January 2026

| Date   | Event                                         |
| ------ | --------------------------------------------- |
| Jan 19 | GSoC 2026 Organization Applications Open      |
`;

  it('reads programs, rewards and the Orion programs they match', () => {
    const { programs } = parseDirectory(markdown);
    expect(programs.map(p => [p.name, p.kind, p.paid, p.programKey])).toEqual([
      ['Google Summer of Code (GSoC)', 'fellowship', true, 'gsoc'],
      ['Season of KDE', 'fellowship', false, null],
      ['LFX Mentorship', 'fellowship', true, 'lfx-mentorship'],
      ['Hacktoberfest', 'challenge', null, 'hacktoberfest'],
    ]);
    expect(programs[0]).toMatchObject({ acronym: 'GSoC', url: 'https://summerofcode.withgoogle.com/', reward: '$1,500 – $6,600' });
  });

  it('files dated events under their program, once per day', () => {
    const { programs, otherEvents } = parseDirectory(markdown);
    const events = Object.fromEntries(programs.map(p => [p.name, p.events]));
    expect(events['Google Summer of Code (GSoC)']).toEqual([{ date: '2026-01-19', label: 'GSoC 2026 Org Applications Open (18:00 UTC)' }]);
    expect(events['LFX Mentorship']).toEqual([{ date: '2026-01-07', endDate: '2026-01-20', label: 'LFX Spring 2026 Project Proposal Window' }]);
    expect(events['Season of KDE']).toEqual([{ date: '2026-01-14', label: 'Season of KDE 2026 Application Deadline' }]);
    expect(otherEvents).toEqual([{ date: '2026-04-01', label: 'SSoC 2026 Registration Opens' }]);
  });

  it('parses only exact dates', () => {
    expect(parseEventDate('Oct 1-31', 2026)).toEqual({ date: '2026-10-01', endDate: '2026-10-31' });
    expect(parseEventDate('Dec', 2026)).toBeNull();
    expect(parseEventDate('Jun-Aug', 2026)).toBeNull();
  });
});
