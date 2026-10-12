import 'server-only';
import type { Issue } from '@/types';
import { countIssues, repoFullName, request, searchIssues } from './github';

/**
 * A contributor's public open source record, built only from what GitHub
 * already shows publicly: merged pull requests and where they landed.
 */

export interface ProfileUser {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  followers: number;
  publicRepos: number;
  createdAt: string;
  htmlUrl: string;
}

export interface MergedPull {
  title: string;
  url: string;
  repo: string;
  mergedAt: string;
}

export interface PublicProfile {
  user: ProfileUser;
  mergedTotal: number;
  mergedThisYear: number | null;
  /** Hacktoberfest-accepted pull requests in the latest season. */
  hacktoberfest: { year: number; count: number } | null;
  recent: MergedPull[];
  /** Other people's repositories the merged pull requests landed in, most first. */
  repositories: Array<{ fullName: string; count: number }>;
  languages: Array<{ name: string; repos: number }>;
}

type PullItem = Issue & { pull_request?: { merged_at?: string | null } };

export function summarizePulls(items: PullItem[], login: string) {
  const recent: MergedPull[] = items
    .filter(item => item.pull_request?.merged_at)
    .map(item => ({
      title: item.title,
      url: item.html_url,
      repo: repoFullName(item.repository_url),
      mergedAt: item.pull_request!.merged_at!,
    }))
    .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt));

  const counts = new Map<string, number>();
  for (const pull of recent) {
    if (pull.repo.split('/')[0].toLowerCase() === login.toLowerCase()) continue;
    counts.set(pull.repo, (counts.get(pull.repo) ?? 0) + 1);
  }
  const repositories = [...counts]
    .map(([fullName, count]) => ({ fullName, count }))
    .sort((a, b) => b.count - a.count || a.fullName.localeCompare(b.fullName));
  return { recent, repositories };
}

export function languagesOf(repos: Array<{ language: string | null; fork?: boolean }>) {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    if (repo.fork || !repo.language) continue;
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }
  return [...counts].map(([name, count]) => ({ name, repos: count })).sort((a, b) => b.repos - a.repos);
}

/** The Hacktoberfest season to report: this year's from October, otherwise last year's. */
export function hacktoberfestSeason(now: Date): number {
  return now.getUTCMonth() >= 9 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

export async function getPublicProfile(username: string, now: Date = new Date()): Promise<PublicProfile> {
  // The account itself must exist (GitHubError 404 otherwise).
  const raw = await request<Record<string, unknown>>(`/users/${encodeURIComponent(username)}`, { revalidate: 21600 });
  const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
  const user: ProfileUser = {
    login: String(raw.login),
    name: text(raw.name),
    avatarUrl: String(raw.avatar_url ?? ''),
    bio: text(raw.bio),
    company: text(raw.company),
    location: text(raw.location),
    blog: text(raw.blog),
    followers: Number(raw.followers ?? 0),
    publicRepos: Number(raw.public_repos ?? 0),
    createdAt: String(raw.created_at ?? ''),
    htmlUrl: String(raw.html_url ?? `https://github.com/${username}`),
  };

  const year = now.getUTCFullYear();
  const season = hacktoberfestSeason(now);
  const [merged, thisYear, hacktoberfest, repos] = await Promise.all([
    searchIssues(`author:${user.login} is:pr is:merged`, { sort: 'updated', perPage: 100, includePullRequests: true, revalidate: 3600 }).catch(
      () => null
    ),
    countIssues(`author:${user.login} is:pr is:merged merged:>=${year}-01-01`, 3600),
    countIssues(`author:${user.login} is:pr label:hacktoberfest-accepted created:${season}-10-01..${season}-10-31`, 3600),
    request<Array<{ language: string | null; fork?: boolean }>>(
      `/users/${encodeURIComponent(user.login)}/repos?type=owner&sort=pushed&per_page=100`,
      { revalidate: 21600 }
    ).catch(() => []),
  ]);

  const { recent, repositories } = summarizePulls((merged?.items ?? []) as PullItem[], user.login);
  return {
    user,
    mergedTotal: merged?.total_count ?? recent.length,
    mergedThisYear: thisYear,
    hacktoberfest: hacktoberfest ? { year: season, count: hacktoberfest } : null,
    recent: recent.slice(0, 10),
    repositories: repositories.slice(0, 12),
    languages: languagesOf(repos).slice(0, 8),
  };
}
