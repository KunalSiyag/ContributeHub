import 'server-only';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import type { Issue, Repository, SearchResponse } from '@/types';
import { buildIssueQuery } from './issue-query';

const GITHUB_API = 'https://api.github.com';

export class GitHubError extends Error {
  constructor(
    public status: number,
    message: string,
    public rateLimited = false,
    /** Epoch milliseconds when the rate limit resets, if known. */
    public resetAt?: number
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

export function hasGitHubToken() {
  return Boolean(process.env.GITHUB_TOKEN);
}

function headers(accept = 'application/vnd.github+json'): HeadersInit {
  const result: Record<string, string> = {
    Accept: accept,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'orion-open-source-hub',
  };
  if (process.env.GITHUB_TOKEN) result.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return result;
}

interface RequestOptions {
  /** Seconds to keep the response in the Next.js data cache. */
  revalidate?: number;
  accept?: string;
}

/** A cached GET against the GitHub REST API; errors arrive as GitHubError. */
export async function request<T>(path: string, { revalidate = 300, accept }: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API}${path}`, {
      headers: headers(accept),
      next: { revalidate },
    });
  } catch {
    throw new GitHubError(503, 'GitHub could not be reached.');
  }

  if (response.ok) return (await response.json()) as T;

  const remaining = response.headers.get('x-ratelimit-remaining');
  const reset = Number(response.headers.get('x-ratelimit-reset'));
  const retryAfter = Number(response.headers.get('retry-after'));
  const rateLimited =
    response.status === 429 || (response.status === 403 && (remaining === '0' || Number.isFinite(retryAfter)));

  if (rateLimited) {
    const resetAt = Number.isFinite(reset) && reset > 0 ? reset * 1000 : Date.now() + (retryAfter || 60) * 1000;
    throw new GitHubError(429, 'GitHub rate limit reached.', true, resetAt);
  }
  if (response.status === 404) throw new GitHubError(404, 'Not found on GitHub.');
  if (response.status === 422) throw new GitHubError(422, 'GitHub rejected the search query.');
  throw new GitHubError(response.status >= 500 ? 502 : response.status, `GitHub returned ${response.status}.`);
}

/** Human-friendly description of when a rate limit lifts. */
export function describeReset(resetAt?: number) {
  if (!resetAt) return 'in a few minutes';
  const minutes = Math.max(1, Math.ceil((resetAt - Date.now()) / 60000));
  return minutes === 1 ? 'in about a minute' : `in about ${minutes} minutes`;
}

/**
 * For pages cached with ISR, call before rendering a GitHub failure notice.
 * A rate limit or outage is over in minutes, but a rendered notice would be
 * cached for the page's whole revalidate window. While serving, this rethrows
 * instead: a failed refresh keeps the last good copy, and Vercel tries again
 * after 30 seconds. A build has no copy to keep, so the notice renders, and a
 * one-minute fetch makes the route refresh soon (a route revalidates as often
 * as its shortest fetch).
 */
export async function keepLastGoodPage(error: unknown): Promise<void> {
  if (!(error instanceof GitHubError) || !(error.rateLimited || error.status >= 500)) return;
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    // GitHub's rate_limit endpoint doesn't count against the quota.
    await fetch(`${GITHUB_API}/rate_limit`, { headers: headers(), next: { revalidate: 60 } }).catch(() => undefined);
  } else if (process.env.NODE_ENV === 'production') {
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

export interface SearchOptions {
  sort?: string;
  order?: 'asc' | 'desc';
  perPage?: number;
  page?: number;
  revalidate?: number;
  /** Issue searches drop pull requests by default; set for `is:pr` queries. */
  includePullRequests?: boolean;
}

function searchParams(q: string, { sort, order = 'desc', perPage = 20, page = 1 }: SearchOptions) {
  const params = new URLSearchParams({ q, per_page: String(perPage), page: String(page) });
  if (sort) {
    params.set('sort', sort);
    params.set('order', order);
  }
  return params.toString();
}

export async function searchIssues(q: string, options: SearchOptions = {}): Promise<SearchResponse<Issue>> {
  const data = await request<SearchResponse<Issue & { pull_request?: unknown }>>(
    `/search/issues?${searchParams(q, options)}`,
    { revalidate: options.revalidate ?? 300 }
  );
  const items = options.includePullRequests ? data.items ?? [] : (data.items ?? []).filter(item => !item.pull_request);
  return { total_count: data.total_count ?? items.length, incomplete_results: data.incomplete_results, items };
}

export async function searchRepositories(q: string, options: SearchOptions = {}): Promise<SearchResponse<Repository>> {
  return request<SearchResponse<Repository>>(`/search/repositories?${searchParams(q, options)}`, {
    revalidate: options.revalidate ?? 300,
  });
}

/** Total result count for an issue query, or null when GitHub is unavailable. */
/**
 * Live data for many repositories in a few searches (40 repo: qualifiers per
 * query, cached six hours). Missing repositories are simply absent; rate
 * limits are reported, not thrown.
 */
export async function fetchLiveRepos(slugs: string[]): Promise<{ repos: Map<string, Repository>; rateLimited: boolean }> {
  const repos = new Map<string, Repository>();
  let rateLimited = false;
  const BATCH = 40;

  for (let i = 0; i < slugs.length; i += BATCH) {
    const batch = slugs.slice(i, i + BATCH);
    try {
      const result = await searchRepositories(batch.map(slug => `repo:${slug}`).join(' '), {
        perPage: 100,
        revalidate: 6 * 3600,
      });
      for (const repo of result.items) repos.set(repo.full_name.toLowerCase(), repo);
    } catch (err) {
      if (err instanceof GitHubError && err.rateLimited) rateLimited = true;
    }
  }

  return { repos, rateLimited };
}

export async function countIssues(q: string, revalidate = 900): Promise<number | null> {
  try {
    const data = await request<{ total_count: number }>(`/search/issues?${searchParams(q, { perPage: 1 })}`, {
      revalidate,
    });
    return data.total_count ?? null;
  } catch {
    return null;
  }
}

export { buildIssueQuery, buildRepoQuery, ISSUE_PRESETS, ISSUE_SORTS } from './issue-query';
export type { IssuePreset, IssueQuery, IssueSort, RepoQuery } from './issue-query';

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

export interface IssueDetail extends Issue {
  body_html?: string;
  body_text?: string;
  pull_request?: { html_url: string };
  state_reason?: string | null;
  assignees?: Array<{ login: string; avatar_url: string; html_url: string }>;
  author_association?: string;
  closed_at?: string | null;
  locked?: boolean;
}

export async function getIssue(owner: string, repo: string, number: number): Promise<IssueDetail> {
  return request<IssueDetail>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${number}`, {
    revalidate: 300,
    accept: 'application/vnd.github.full+json',
  });
}

export async function getRepository(owner: string, repo: string): Promise<Repository> {
  return request<Repository>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
    revalidate: 3600,
  });
}

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
}

/** Public profile of a GitHub account; throws a 404 GitHubError when it doesn't exist. */
export async function getUser(username: string): Promise<GitHubUser> {
  return request<GitHubUser>(`/users/${encodeURIComponent(username)}`, { revalidate: 86400 });
}

/** Repositories pushed this week that are asking for help. */
export async function getTrendingRepositories(perPage = 12): Promise<Repository[]> {
  const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const data = await searchRepositories(`pushed:>=${since} stars:>=500 help-wanted-issues:>0 archived:false`, {
    sort: 'stars',
    perPage,
    revalidate: 1800,
  });
  return data.items;
}

/** A repository's README as raw markdown. */
export async function getReadmeMarkdown(fullName: string, revalidate = 21600): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API}/repos/${fullName}/readme`, {
      headers: headers('application/vnd.github.raw'),
      next: { revalidate },
    });
  } catch {
    throw new GitHubError(503, 'GitHub could not be reached.');
  }
  if (!response.ok) throw new GitHubError(response.status === 404 ? 404 : 502, `GitHub returned ${response.status}.`);
  return response.text();
}

export async function getGoodFirstIssues(perPage = 12, language?: string): Promise<SearchResponse<Issue>> {
  return searchIssues(buildIssueQuery({ preset: 'good-first', language }), {
    sort: 'created',
    perPage,
    revalidate: 600,
  });
}

/** Repository full name ("owner/repo") from an API repository_url or html_url. */
export function repoFullName(url: string): string {
  // API URLs (api.github.com/repos/o/r) first: they also contain "github.com/".
  const match = url.match(/\/repos\/([^/]+)\/([^/#?]+)/) ?? url.match(/github\.com\/([^/]+)\/([^/#?]+)/);
  return match ? `${match[1]}/${match[2]}` : '';
}
