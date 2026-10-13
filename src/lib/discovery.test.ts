import { describe, expect, it } from 'vitest';
import {
  mergeStarterProjects,
  parseAwesomeForBeginners,
  parseForGoodFirstIssue,
  parseGoodFirstIssueToml,
  parseUpForGrabs,
  starterIssuesUrl,
} from './starter-projects';
import { batchOrder, parseYcCompanies } from './yc';
import { collectionSlug } from './collections';
import { dailyPick } from './watchlist';
import { categoryLabel, isCategory, isMissingTable } from './community';
import { rankEntries, statsQuery, windowStart } from './leaderboard.server';

describe('starter projects', () => {
  const upForGrabs = parseUpForGrabs({
    react: {
      name: 'React',
      desc: 'A JavaScript library for building user interfaces.',
      site: 'https://react.dev',
      tags: ['javascript', 'ui'],
      upforgrabs: { name: 'good first issue', link: 'https://github.com/facebook/react/labels/good%20first%20issue' },
    },
    httpress: {
      name: 'httpress',
      desc: 'Benchmarking tool',
      site: 'https://github.com/GabrielTecuceanu/httpress',
      tags: ['rust'],
      upforgrabs: { name: 'up-for-grabs', link: 'https://example.com/labels' },
    },
    noGithub: { name: 'Elsewhere', site: 'https://gitlab.com/a/b', upforgrabs: { name: 'help', link: 'https://gitlab.com/a/b/labels' } },
  });
  const awesome = parseAwesomeForBeginners({
    repositories: [{ name: 'osu!', link: 'https://github.com/ppy/osu', label: 'good first issue', technologies: ['C#'], description: 'Rhythm game.' }],
  });
  const goodFirst = parseGoodFirstIssueToml("repositories = [\n  'github.com/facebook/react',\n  'github.com/ppy/osu',\n  'github.com/zulip/zulip',\n]");
  const forGood = parseForGoodFirstIssue({
    repositories: [
      {
        owner: 'OpenTermsArchive',
        name: 'engine',
        description: 'Tracks contractual documents.',
        url: 'https://github.com/OpenTermsArchive/engine',
        language: { id: 'javascript', display: 'JavaScript' },
        topics: [{ id: 'sdg-16', display: 'sdg-16' }, { id: 'hacktoberfest' }],
        issues: [
          { labels: [{ display: 'good first issue' }] },
          { labels: [{ display: 'help wanted' }, { display: 'good first issue' }] },
          { labels: [{ display: 'enhancement' }] },
          { labels: [{ display: 'enhancement' }] },
          { labels: [{ display: 'enhancement' }] },
        ],
      },
      { owner: 'zulip', name: 'zulip', url: 'https://github.com/zulip/zulip', topics: [{ id: 'sdg-4' }], issues: [{ labels: [{ display: 'help wanted' }] }] },
      { owner: '', name: '', url: 'https://gitlab.com/x/y' },
    ],
  });

  it('reads each list', () => {
    expect(upForGrabs.map(p => [p.repo, p.label])).toEqual([
      ['facebook/react', 'good first issue'],
      ['GabrielTecuceanu/httpress', 'up-for-grabs'],
    ]);
    expect(awesome[0]).toMatchObject({ repo: 'ppy/osu', tags: ['c#'], description: 'Rhythm game.' });
    expect(goodFirst.map(p => p.repo)).toEqual(['facebook/react', 'ppy/osu', 'zulip/zulip']);
    expect(forGood.map(p => [p.repo, p.label, p.tags])).toEqual([
      ['OpenTermsArchive/engine', 'good first issue', ['social good', 'justice and institutions', 'javascript']],
      ['zulip/zulip', 'help wanted', ['social good', 'education']],
    ]);
  });

  it('merges by repository, consensus first', () => {
    const merged = mergeStarterProjects([upForGrabs, awesome, goodFirst]);
    expect(merged.map(p => [p.repo, p.sources.length])).toEqual([
      ['facebook/react', 2],
      ['ppy/osu', 2],
      ['GabrielTecuceanu/httpress', 1],
      ['zulip/zulip', 1],
    ]);
    expect(merged[0].description).toBe('A JavaScript library for building user interfaces.');
    expect(mergeStarterProjects([goodFirst, forGood]).find(p => p.repo === 'zulip/zulip')).toMatchObject({
      label: 'help wanted',
      tags: ['social good', 'education'],
      sources: ['goodfirstissue', 'for-good'],
    });
  });

  it('links to the project’s own starter label', () => {
    expect(starterIssuesUrl({ repo: 'GabrielTecuceanu/httpress', label: 'up-for-grabs' })).toBe(
      `https://github.com/GabrielTecuceanu/httpress/issues?q=${encodeURIComponent('is:issue is:open label:"up-for-grabs"')}`
    );
  });
});

describe('open source companies', () => {
  it('reads the YC snapshot', () => {
    const [company] = parseYcCompanies([
      {
        slug: 'supabase',
        name: 'Supabase',
        one_liner: 'The open source Firebase alternative',
        website: 'https://supabase.com',
        small_logo_thumb_url: 'https://example.com/logo.png',
        batch: 'Summer 2020',
        status: 'Active',
        isHiring: true,
        team_size: 300,
        industries: ['B2B', 'Infrastructure'],
        all_locations: 'Singapore; Remote',
        url: 'https://www.ycombinator.com/companies/supabase',
      },
      { name: 'No slug' },
    ]);
    expect(company).toMatchObject({ slug: 'supabase', hiring: true, teamSize: 300, batch: 'Summer 2020' });
  });

  it('orders batches newest first', () => {
    const batches = ['Summer 2020', 'Winter 2026', 'W21', 'Fall 2024', 'S25'];
    expect([...batches].sort((a, b) => batchOrder(b) - batchOrder(a))).toEqual(['Winter 2026', 'S25', 'Fall 2024', 'W21', 'Summer 2020']);
  });
});

describe('collections', () => {
  it('make readable slugs', () => {
    expect(collectionSlug({ id: '10010', name: 'AI Agent Frameworks' })).toBe('10010-ai-agent-frameworks');
  });
});

describe('daily pick', () => {
  const issues = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

  it('is stable for a day and ignores list order', () => {
    const today = dailyPick(issues, '2026-10-12');
    expect(dailyPick([...issues].reverse(), '2026-10-12')).toEqual(today);
    expect(dailyPick([{ id: 9 }, ...issues], '2026-10-12')?.id === 9 || dailyPick([{ id: 9 }, ...issues], '2026-10-12') === today).toBe(true);
  });

  it('changes over days', () => {
    const picks = new Set(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'].map(day => dailyPick(issues, day)?.id));
    expect(picks.size).toBeGreaterThan(1);
    expect(dailyPick([], '2026-10-12')).toBeUndefined();
  });
});

describe('community helpers', () => {
  it('know the categories', () => {
    expect(isCategory('programs')).toBe(true);
    expect(isCategory('spam')).toBe(false);
    expect(categoryLabel('showcase')).toBe('Show your work');
  });

  it('recognise a database without the forum tables', () => {
    expect(isMissingTable({ code: 'PGRST205' })).toBe(true);
    expect(isMissingTable({ code: '42P01' })).toBe(true);
    expect(isMissingTable({ code: '42501' })).toBe(false);
  });
});

describe('leaderboard ranking', () => {
  const entry = (login: string, merged: number | null, mergedAll: number | null = null) => ({
    login,
    name: login.toUpperCase(),
    avatarUrl: null,
    merged,
    mergedAll,
    pullRequests: null,
    issues: null,
    verified: false,
  });

  it('puts the most merged first and unknown counts last', () => {
    expect(rankEntries([entry('b', 3), entry('a', null), entry('c', 7), entry('d', 3)]).map(e => e.login)).toEqual(['c', 'b', 'd', 'a']);
    expect(windowStart(new Date('2026-10-12T00:00:00Z'))).toBe('2026-09-12');
  });

  it('ranks by all-time merges when asked', () => {
    expect(rankEntries([entry('a', 9, 10), entry('b', 1, 400), entry('c', 5, null)], 'all').map(e => e.login)).toEqual(['b', 'a', 'c']);
  });

  it('asks GitHub for every member in one aliased query', () => {
    const query = statsQuery(2);
    expect(query.startsWith('query($q0: String!, $l0: String!, $q1: String!, $l1: String!)')).toBe(true);
    expect(query).toContain('m1: search(query: $q1, type: ISSUE, first: 1) { issueCount }');
    expect(query).toContain('u1: user(login: $l1) { mergedAll: pullRequests(states: MERGED) { totalCount } pullRequests { totalCount } issues { totalCount } }');
  });
});
