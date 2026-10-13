import { describe, expect, it } from 'vitest';
import type { Repository } from '@/types';
import { healthChecks, healthScore, median, mergeHours, type RepoHealth } from './repo-health';
import { parseRepoInput } from '@/app/repos/repo-input';

const NOW = Date.parse('2026-10-11T12:00:00Z');

const repo = (over: Partial<Repository> = {}): Repository => ({
  id: 1,
  name: 'zulip',
  full_name: 'zulip/zulip',
  description: null,
  html_url: 'https://github.com/zulip/zulip',
  homepage: null,
  language: 'Python',
  stargazers_count: 22000,
  forks_count: 8000,
  open_issues_count: 1200,
  watchers_count: 0,
  topics: [],
  created_at: '2015-09-25T00:00:00Z',
  updated_at: '2026-10-10T00:00:00Z',
  pushed_at: '2026-10-10T00:00:00Z',
  owner: { login: 'zulip', avatar_url: '', html_url: '' },
  license: { name: 'Apache License 2.0', spdx_id: 'Apache-2.0' },
  ...over,
});

const healthy: RepoHealth = {
  repo: repo(),
  communityScore: 100,
  files: { readme: true, contributing: true, codeOfConduct: true, license: true, issueTemplate: true, pullRequestTemplate: false },
  languages: [{ name: 'Python', share: 0.8 }],
  contributors: [],
  topContributorShare: 0.3,
  weeklyCommits: [0, 4, 12, 9],
  pulls: { mergedRecently: 40, closedRecently: 50, medianMergeHours: 30 },
  issues: { goodFirst: 120, goodFirstUnassigned: 34, helpWanted: 80, medianCloseDays: 12 },
  latestRelease: { tag: 'v11.0', date: '2026-08-01T00:00:00Z' },
};

describe('repository health', () => {
  it('takes medians of odd and even lists', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });

  it('measures merge times of merged pull requests only', () => {
    expect(
      mergeHours([
        { created_at: '2026-10-01T00:00:00Z', merged_at: '2026-10-02T12:00:00Z' },
        { created_at: '2026-10-01T00:00:00Z', merged_at: null },
      ])
    ).toEqual([36]);
  });

  it('scores a welcoming project highly', () => {
    const checks = healthChecks(healthy, NOW);
    expect(checks.every(check => check.ok)).toBe(true);
    expect(healthScore(checks)).toBe(100);
  });

  it('flags the signals that keep newcomers out', () => {
    const checks = healthChecks(
      {
        ...healthy,
        repo: repo({ license: null, pushed_at: '2025-01-01T00:00:00Z' }),
        files: { readme: true, contributing: false, codeOfConduct: false, license: false, issueTemplate: false, pullRequestTemplate: false },
        topContributorShare: 0.95,
        weeklyCommits: null,
        pulls: { mergedRecently: 2, closedRecently: 20, medianMergeHours: 24 * 40 },
        issues: { goodFirst: 0, goodFirstUnassigned: 0, helpWanted: 0, medianCloseDays: null },
        latestRelease: null,
      },
      NOW
    );
    const failing = checks.filter(check => check.ok === false).map(check => check.id);
    expect(failing).toEqual(['contributing', 'conduct', 'license', 'templates', 'good-first', 'active', 'merges', 'merge-speed', 'bus-factor', 'releases']);
    expect(healthScore(checks)).toBe(0);
  });

  it('leaves unknown signals out of the score', () => {
    const checks = healthChecks({ ...healthy, files: null, pulls: null, issues: { ...healthy.issues, goodFirstUnassigned: null } }, NOW);
    expect(checks.filter(check => check.ok === null).map(check => check.id)).toEqual([
      'contributing',
      'conduct',
      'templates',
      'good-first',
      'merges',
      'merge-speed',
    ]);
    expect(healthScore(checks)).toBe(100);
  });
});

describe('repository input', () => {
  it.each([
    ['zulip/zulip', { owner: 'zulip', repo: 'zulip' }],
    ['https://github.com/vercel/next.js', { owner: 'vercel', repo: 'next.js' }],
    ['github.com/mermaid-js/mermaid.git', { owner: 'mermaid-js', repo: 'mermaid' }],
    ['https://github.com/zulip/zulip/issues/12', { owner: 'zulip', repo: 'zulip' }],
    ['zulip', null],
    ['https://gitlab.com/a/b/c', null],
  ])('reads %s', (input, expected) => {
    expect(parseRepoInput(input)).toEqual(expected);
  });
});
