import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildIssueQuery, buildRepoQuery, describeReset, keepLastGoodPage, repoFullName, searchIssues, GitHubError } from '@/lib/github';

describe('buildIssueQuery', () => {
  it('builds the default good-first-issue query', () => {
    expect(buildIssueQuery({})).toBe('is:issue is:open archived:false label:"good first issue" no:assignee');
  });

  it('quotes multi-word labels and languages, strips injected quotes', () => {
    const q = buildIssueQuery({ preset: 'all', labels: ['help wanted', 'docs"'], language: 'C#' });
    expect(q).toContain('label:"help wanted"');
    expect(q).toContain('label:docs');
    expect(q).toContain('language:C#');
    expect(q).not.toContain('docs"');
  });

  it('caps labels and flattens newlines in free text', () => {
    const q = buildIssueQuery({ preset: 'unassigned', labels: ['a', 'b', 'c', 'd', 'e', 'f'], text: 'line one\nline two' });
    expect(q).not.toContain('label:f');
    expect(q).toContain('line one line two');
    expect(q).toContain('no:assignee');
  });
});

describe('buildRepoQuery', () => {
  it('falls back to active help-wanted projects', () => {
    expect(buildRepoQuery({})).toBe('help-wanted-issues:>0 stars:>=100 archived:false');
  });

  it('combines filters', () => {
    expect(buildRepoQuery({ text: 'parser', language: 'Rust', topics: ['cli'], minStars: 1000 })).toBe(
      'parser language:Rust topic:cli stars:>=1000 archived:false'
    );
  });
});

describe('helpers', () => {
  it('extracts owner/repo from API and web URLs', () => {
    expect(repoFullName('https://api.github.com/repos/vercel/next.js')).toBe('vercel/next.js');
    expect(repoFullName('https://github.com/vercel/next.js/issues/1')).toBe('vercel/next.js');
  });

  it('describes rate-limit resets in minutes', () => {
    expect(describeReset(Date.now() + 5 * 60000)).toBe('in about 5 minutes');
    expect(describeReset(Date.now() + 10000)).toBe('in about a minute');
    expect(describeReset()).toBe('in a few minutes');
  });
});

describe('searchIssues', () => {
  afterEach(() => vi.unstubAllGlobals());

  const respond = (body: unknown, init: ResponseInit = { status: 200 }) =>
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), init)));

  const items = [
    { id: 1, title: 'an issue' },
    { id: 2, title: 'a pull request', pull_request: { url: 'x' } },
  ];

  it('drops pull requests from issue searches by default', async () => {
    respond({ total_count: 2, incomplete_results: false, items });
    const result = await searchIssues('is:open');
    expect(result.items.map(i => i.id)).toEqual([1]);
  });

  it('keeps pull requests when asked (activity feed)', async () => {
    respond({ total_count: 2, incomplete_results: false, items });
    const result = await searchIssues('is:pr author:x', { includePullRequests: true });
    expect(result.items.map(i => i.id)).toEqual([1, 2]);
  });

  it('turns a GitHub rate limit into a typed error with the reset time', async () => {
    const reset = Math.floor(Date.now() / 1000) + 600;
    respond({ message: 'API rate limit exceeded' }, { status: 403, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(reset) } });
    const error = await searchIssues('is:open').catch(e => e);
    expect(error).toBeInstanceOf(GitHubError);
    expect(error.rateLimited).toBe(true);
    expect(error.resetAt).toBe(reset * 1000);
  });
});

describe('keepLastGoodPage', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const limited = new GitHubError(429, 'GitHub rate limit reached.', true);

  it('rethrows rate limits and outages while serving, so a cached page keeps its last good copy', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await expect(keepLastGoodPage(limited)).rejects.toBe(limited);
    const outage = new GitHubError(503, 'GitHub could not be reached.');
    await expect(keepLastGoodPage(outage)).rejects.toBe(outage);
    // Answers that won't change on a retry render as usual.
    await expect(keepLastGoodPage(new GitHubError(422, 'GitHub rejected the search query.'))).resolves.toBeUndefined();
    await expect(keepLastGoodPage(new Error('unrelated'))).resolves.toBeUndefined();
  });

  it('lets the build render the notice and cache it for a minute', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    const fetchMock = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(keepLastGoodPage(limited)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/rate_limit', expect.objectContaining({ next: { revalidate: 60 } }));
  });

  it('never throws in development, where nothing is cached', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    await expect(keepLastGoodPage(limited)).resolves.toBeUndefined();
  });
});
