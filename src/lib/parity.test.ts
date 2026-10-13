import { describe, expect, it } from 'vitest';
import { parseDiscoverState, toSearchString, issueRequestParams } from '@/app/discover/discover-state';
import { SEARCH_INTENT } from './assistant';
import { sortBounties, type BountyIssue } from './bounties';
import { readSources } from './gemini';
import { rankFor } from './leaderboard.server';
import { parsePerks } from './perks';

describe('perks list', () => {
  const markdown = `# Awesome OSS Perks
## Contents
- [AI & Machine Learning](#ai--machine-learning)
## AI & Machine Learning
- [CodeRabbit](https://www.coderabbit.ai/oss) - Free AI code reviews for public repositories.
- [Bad link](http://insecure.example) - Not https, skipped.
## Testing
* [BrowserStack](https://www.browserstack.com/open-source) — Free cross-browser testing for open source.
## Contributing
- [Not a perk](https://example.com) - Under Contributing, skipped.
`;

  it('reads perks under their category and skips everything else', () => {
    expect(parsePerks(markdown, new Set(['browserstack.com']))).toEqual([
      { name: 'CodeRabbit', url: 'https://www.coderabbit.ai/oss', description: 'Free AI code reviews for public repositories.', category: 'AI & Machine Learning', checked: false },
      { name: 'BrowserStack', url: 'https://www.browserstack.com/open-source', description: 'Free cross-browser testing for open source.', category: 'Testing', checked: true },
    ]);
  });
});

describe('Discover filters from Ossium', () => {
  it('keeps a label on the issues tab and sends it to the API', () => {
    const state = parseDiscoverState(new URLSearchParams('label=hacktoberfest&language=Go'));
    expect(state.label).toBe('hacktoberfest');
    expect(toSearchString(state)).toBe('label=hacktoberfest&language=Go');
    expect(issueRequestParams(state)).toContain('labels=hacktoberfest');
    expect(parseDiscoverState(new URLSearchParams('label=anything')).label).toBe('');
  });

  it('keeps a GSoC year on the organizations tab', () => {
    const state = parseDiscoverState(new URLSearchParams('tab=organizations&year=2024'));
    expect(state.year).toBe('2024');
    expect(toSearchString(state)).toBe('tab=organizations&year=2024');
    expect(parseDiscoverState(new URLSearchParams('tab=organizations&year=24')).year).toBe('');
  });
});

describe('assistant search', () => {
  it('recognises requests to find issues', () => {
    expect(SEARCH_INTENT.test('Find good first issues in Rust about parsers')).toBe(true);
    expect(SEARCH_INTENT.test('Can you recommend some beginner tasks in Go?')).toBe(true);
    expect(SEARCH_INTENT.test('Explain zulip/zulip')).toBe(false);
  });

  it('lists the web pages a grounded answer used, once each', () => {
    expect(
      readSources({
        groundingMetadata: {
          groundingChunks: [
            { web: { uri: 'https://hacktoberfest.com/', title: 'hacktoberfest.com' } },
            { web: { uri: 'https://hacktoberfest.com/', title: 'again' } },
            { web: { uri: 'javascript:alert(1)', title: 'bad' } },
            { web: { uri: 'https://example.org/page' } },
          ],
        },
      })
    ).toEqual([
      { title: 'hacktoberfest.com', url: 'https://hacktoberfest.com/' },
      { title: 'example.org', url: 'https://example.org/page' },
    ]);
    expect(readSources(null)).toEqual([]);
  });
});

describe('you vs the board', () => {
  const entry = (merged: number | null) => ({ login: String(merged), name: '', avatarUrl: null, merged, mergedAll: null, pullRequests: null, issues: null, verified: false });

  it('places a figure among the entries, ties sharing the better rank', () => {
    const board = [entry(9), entry(5), entry(5), entry(1)];
    expect(rankFor(7, board)).toBe(2);
    expect(rankFor(5, board)).toBe(2);
    expect(rankFor(0, board)).toBe(5);
    expect(rankFor(null, board)).toBe(5);
  });
});

describe('bounty sorting by date', () => {
  const bounty = (id: string, createdAt: string): BountyIssue => ({
    id, number: 1, title: id, repo: 'a/b', url: '', bountyAmount: 'Bounty', bountyValue: 0, source: 'github', labels: [], createdAt, assignees: 0, comments: 0,
  });
  const list = [bounty('b', '2026-05-01T00:00:00Z'), bounty('c', '2026-09-01T00:00:00Z'), bounty('a', '2026-01-01T00:00:00Z')];

  it('orders by creation date both ways', () => {
    expect(sortBounties(list, 'newest').map(b => b.id)).toEqual(['c', 'b', 'a']);
    expect(sortBounties(list, 'oldest').map(b => b.id)).toEqual(['a', 'b', 'c']);
  });
});
