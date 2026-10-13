import { describe, it, expect } from 'vitest';
import { parseBountyAmount, computeBountyStats, featuredBounties, isEstablished, isRepostedListing, sortBounties, BountyIssue } from '@/lib/bounties';

describe('parseBountyAmount', () => {
  it.each([
    ['$100', 100],
    ['💰 $500 bounty', 500],
    ['Reward: $1,340 for WearOS support', 1340],
    ['payout 2000 USD on merge', 2000],
    ['750 USDC reward', 750],
    ['$12.75 tip', 12.75],
  ])('extracts %s', (input, expected) => {
    const parsed = parseBountyAmount(input);
    expect(parsed?.value).toBe(expected);
  });

  it.each(['no money here', '', 'label: bounty', 'costs 3 dollars'])(
    'returns null for %j',
    input => {
      expect(parseBountyAmount(input)).toBeNull();
    }
  );

  it('rejects implausibly small and large amounts', () => {
    expect(parseBountyAmount('$1')).toBeNull();
    expect(parseBountyAmount('$999999')).toBeNull();
  });

  it('formats with thousands separators', () => {
    expect(parseBountyAmount('$1340')?.amount).toBe('$1,340');
  });
});

const makeBounty = (over: Partial<BountyIssue>): BountyIssue => ({
  id: 'x',
  number: 1,
  title: 't',
  repo: 'a/b',
  url: 'https://github.com/a/b/1',
  bountyAmount: '$0',
  bountyValue: 0,
  source: 'github',
  labels: [],
  createdAt: '2026-01-01',
  assignees: 0,
  comments: 0,
  ...over,
});

describe('computeBountyStats', () => {
  it('sums the pool, counts unclaimed, finds the top repo', () => {
    const stats = computeBountyStats([
      makeBounty({ id: '1', bountyValue: 100, repo: 'a/b' }),
      makeBounty({ id: '2', bountyValue: 250, repo: 'c/d', assignees: 2 }),
      makeBounty({ id: '3', bountyValue: 50, repo: 'a/b' }),
      makeBounty({ id: '4', bountyValue: 0, repo: 'e/f' }),
    ]);
    expect(stats.totalPool).toBe(400);
    expect(stats.count).toBe(4);
    expect(stats.unclaimedCount).toBe(3);
    expect(stats.topRepo).toBe('c/d');
  });

  it('handles empty lists', () => {
    const stats = computeBountyStats([]);
    expect(stats).toEqual({ totalPool: 0, count: 0, unclaimedCount: 0, topRepo: null });
  });
});

describe('isRepostedListing', () => {
  it.each([
    ['zhangjiayang6835-cyber/bounty-plaza', 'Fix the sampler'],
    ['someone/bounties-board', 'Port the parser'],
    ['Vikingr2023/awesome-agent-bounties', 'Add a list entry'],
    ['tenstorrent/tt-metal', '[Bounty] [Bounty $3000] Fix distributed LayerNorm'],
  ])('skips %s: %s', (repo, title) => {
    expect(isRepostedListing({ repo, title })).toBe(true);
  });

  it.each([
    ['tenstorrent/tt-metal', '[Bounty $3,000] Fix ttnn.sampling distribution bias'],
    ['claude-builders-bounty/claude-builders-bounty', '[BOUNTY $150] AGENT: review a PR'],
    ['algora-io/algora', '[UI Bug] Edit buttons visible on /bounties page'],
    ['bountysource/core', 'Alternatives to Bountysource'],
  ])('keeps %s: %s', (repo, title) => {
    expect(isRepostedListing({ repo, title })).toBe(false);
  });
});

describe('established repositories', () => {
  const bounty = (repo: string, value: number, repoStars?: number): BountyIssue => ({
    id: `${repo}-${value}`,
    number: 1,
    title: `Bounty ${value}`,
    repo,
    url: `https://github.com/${repo}/issues/1`,
    bountyAmount: `$${value}`,
    bountyValue: value,
    source: 'github',
    labels: ['bounty'],
    createdAt: '2026-10-01T00:00:00Z',
    assignees: 0,
    comments: 0,
    repoStars,
  });

  it('treats unknown star counts as established', () => {
    expect(isEstablished({ repoStars: undefined })).toBe(true);
    expect(isEstablished({ repoStars: 10 })).toBe(true);
    expect(isEstablished({ repoStars: 3 })).toBe(false);
  });

  it('features one bounty per established repository, largest first', () => {
    const picks = featuredBounties([
      bounty('spam/new-repo', 25000, 0),
      bounty('tenstorrent/tt-metal', 3000, 1200),
      bounty('tenstorrent/tt-metal', 2500, 1200),
      bounty('algora-io/algora', 2500, 900),
      bounty('unknown/repo', 400),
    ]);
    expect(picks.map(b => `${b.repo}:${b.bountyValue}`)).toEqual([
      'tenstorrent/tt-metal:3000',
      'algora-io/algora:2500',
      'unknown/repo:400',
    ]);
  });
});

describe('sortBounties', () => {
  const bounty = (id: string, value: number, comments: number, updatedAt: string) => ({
    id,
    number: 1,
    title: id,
    repo: 'acme/app',
    url: `https://github.com/acme/app/issues/${id}`,
    bountyAmount: value ? `$${value}` : 'Bounty',
    bountyValue: value,
    source: 'github' as const,
    labels: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt,
    assignees: 0,
    comments,
  });
  const list = [bounty('a', 100, 2, '2026-10-01T00:00:00Z'), bounty('b', 500, 0, '2026-09-01T00:00:00Z'), bounty('c', 0, 9, '2026-10-10T00:00:00Z')];

  it('sorts by reward, recency or discussion', () => {
    expect(sortBounties(list, 'amount').map(b => b.id)).toEqual(['b', 'a', 'c']);
    expect(sortBounties(list, 'recent').map(b => b.id)).toEqual(['c', 'a', 'b']);
    expect(sortBounties(list, 'comments').map(b => b.id)).toEqual(['c', 'a', 'b']);
  });
});
