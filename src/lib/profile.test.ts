import { describe, expect, it } from 'vitest';
import type { Issue } from '@/types';
import { hacktoberfestSeason, languagesOf, summarizePulls } from './profile';

const pull = (repo: string, mergedAt: string | null, title = 'Fix'): Issue & { pull_request: { merged_at: string | null } } =>
  ({
    id: Math.random(),
    number: 1,
    title,
    body: null,
    html_url: `https://github.com/${repo}/pull/1`,
    state: 'closed',
    repository_url: `https://api.github.com/repos/${repo}`,
    pull_request: { merged_at: mergedAt },
  }) as unknown as Issue & { pull_request: { merged_at: string | null } };

describe('public profile', () => {
  it('counts merged work in other people’s projects, newest first', () => {
    const { recent, repositories } = summarizePulls(
      [
        pull('zulip/zulip', '2026-09-01T00:00:00Z'),
        pull('octocat/dotfiles', '2026-09-03T00:00:00Z'),
        pull('zulip/zulip', '2026-09-05T00:00:00Z', 'Second'),
        pull('vercel/next.js', '2026-08-01T00:00:00Z'),
        pull('vercel/next.js', null),
      ],
      'Octocat'
    );
    expect(recent.map(p => p.mergedAt.slice(0, 10))).toEqual(['2026-09-05', '2026-09-03', '2026-09-01', '2026-08-01']);
    expect(repositories).toEqual([
      { fullName: 'zulip/zulip', count: 2 },
      { fullName: 'vercel/next.js', count: 1 },
    ]);
  });

  it('ranks languages of original repositories', () => {
    expect(
      languagesOf([
        { language: 'Go' },
        { language: 'TypeScript' },
        { language: 'Go' },
        { language: 'Rust', fork: true },
        { language: null },
      ])
    ).toEqual([
      { name: 'Go', repos: 2 },
      { name: 'TypeScript', repos: 1 },
    ]);
  });

  it('reports the Hacktoberfest season that has started', () => {
    expect(hacktoberfestSeason(new Date('2026-10-11T00:00:00Z'))).toBe(2026);
    expect(hacktoberfestSeason(new Date('2026-06-01T00:00:00Z'))).toBe(2025);
  });
});
