import 'server-only';
import type { Repository } from '@/types';
import { countIssues, getRepository, request } from './github';

/**
 * A contributor's view of a repository: is it welcoming, alive and
 * responsive? Everything comes from public GitHub data, cached for an hour.
 */

export interface CommunityFiles {
  readme: boolean;
  contributing: boolean;
  codeOfConduct: boolean;
  license: boolean;
  issueTemplate: boolean;
  pullRequestTemplate: boolean;
}

export interface Contributor {
  login: string;
  avatarUrl: string;
  contributions: number;
}

export interface RepoHealth {
  repo: Repository;
  /** GitHub's own community-profile percentage. */
  communityScore: number | null;
  files: CommunityFiles | null;
  languages: Array<{ name: string; share: number }>;
  contributors: Contributor[];
  /** Share of the listed commits made by the top contributor (0–1). */
  topContributorShare: number | null;
  /** Commits per week for the last year, oldest first; null while GitHub computes it. */
  weeklyCommits: number[] | null;
  pulls: {
    /** Among recently closed pull requests. */
    mergedRecently: number;
    closedRecently: number;
    medianMergeHours: number | null;
  } | null;
  issues: {
    goodFirst: number | null;
    goodFirstUnassigned: number | null;
    helpWanted: number | null;
    medianCloseDays: number | null;
  };
  latestRelease: { tag: string; date: string } | null;
}

export interface HealthCheck {
  id: string;
  label: string;
  /** null when GitHub didn't give us enough to judge. */
  ok: boolean | null;
  detail: string;
}

const HOUR = 3_600_000;

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Hours from opening to merge, for merged pull requests. */
export function mergeHours(pulls: Array<{ created_at: string; merged_at: string | null }>): number[] {
  return pulls
    .filter(pull => pull.merged_at)
    .map(pull => (Date.parse(pull.merged_at!) - Date.parse(pull.created_at)) / HOUR)
    .filter(hours => Number.isFinite(hours) && hours >= 0);
}

async function optional<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch {
    return null;
  }
}

export async function getRepoHealth(owner: string, name: string): Promise<RepoHealth> {
  // Throws GitHubError (404, rate limit) for the repository itself; every
  // other signal is optional and simply goes missing on failure.
  const repo = await getRepository(owner, name);
  const path = `/repos/${repo.full_name}`;
  const opts = { revalidate: 3600 };
  const quoted = (q: string) => `repo:${repo.full_name} is:issue is:open ${q}`;

  const [community, languages, contributors, participation, pulls, closedIssues, releases, goodFirst, goodFirstUnassigned, helpWanted] =
    await Promise.all([
      optional(
        request<{ health_percentage?: number; files?: Record<string, unknown> }>(`${path}/community/profile`, opts)
      ),
      optional(request<Record<string, number>>(`${path}/languages`, opts)),
      optional(request<Array<{ login?: string; avatar_url?: string; contributions?: number; type?: string }>>(`${path}/contributors?per_page=12`, opts)),
      optional(request<{ all?: number[] }>(`${path}/stats/participation`, opts)),
      optional(
        request<Array<{ created_at: string; merged_at: string | null }>>(
          `${path}/pulls?state=closed&sort=updated&direction=desc&per_page=50`,
          opts
        )
      ),
      optional(
        request<Array<{ created_at: string; closed_at: string | null; pull_request?: unknown }>>(
          `${path}/issues?state=closed&sort=updated&direction=desc&per_page=50`,
          opts
        )
      ),
      optional(request<Array<{ tag_name?: string; published_at?: string; draft?: boolean }>>(`${path}/releases?per_page=5`, opts)),
      countIssues(quoted('label:"good first issue"'), 3600),
      countIssues(quoted('label:"good first issue" no:assignee'), 3600),
      countIssues(quoted('label:"help wanted"'), 3600),
    ]);

  const files = community?.files;
  const languageTotal = Object.values(languages ?? {}).reduce((sum, bytes) => sum + bytes, 0);
  const people = (contributors ?? [])
    .filter(c => c.login && c.type !== 'Bot' && !c.login.endsWith('[bot]'))
    .map(c => ({ login: c.login!, avatarUrl: c.avatar_url ?? '', contributions: c.contributions ?? 0 }));
  const peopleTotal = people.reduce((sum, c) => sum + c.contributions, 0);
  const merged = pulls ? mergeHours(pulls) : [];
  const closeDays = (closedIssues ?? [])
    .filter(issue => !issue.pull_request && issue.closed_at)
    .map(issue => (Date.parse(issue.closed_at!) - Date.parse(issue.created_at)) / (24 * HOUR))
    .filter(days => Number.isFinite(days) && days >= 0);
  const release = (releases ?? []).find(r => !r.draft && r.tag_name && r.published_at);

  return {
    repo,
    communityScore: typeof community?.health_percentage === 'number' ? community.health_percentage : null,
    files: files
      ? {
          readme: Boolean(files.readme),
          contributing: Boolean(files.contributing),
          codeOfConduct: Boolean(files.code_of_conduct || files.code_of_conduct_file),
          license: Boolean(files.license) || Boolean(repo.license),
          issueTemplate: Boolean(files.issue_template),
          pullRequestTemplate: Boolean(files.pull_request_template),
        }
      : null,
    languages: languageTotal
      ? Object.entries(languages!)
          .map(([lang, bytes]) => ({ name: lang, share: bytes / languageTotal }))
          .sort((a, b) => b.share - a.share)
      : [],
    contributors: people,
    topContributorShare: peopleTotal > 0 && people.length > 0 ? people[0].contributions / peopleTotal : null,
    weeklyCommits: Array.isArray(participation?.all) && participation.all.length > 0 ? participation.all : null,
    pulls: pulls
      ? { mergedRecently: merged.length, closedRecently: pulls.length, medianMergeHours: median(merged) }
      : null,
    issues: { goodFirst, goodFirstUnassigned, helpWanted, medianCloseDays: median(closeDays) },
    latestRelease: release ? { tag: release.tag_name!, date: release.published_at! } : null,
  };
}

function since(iso: string, now: number) {
  return (now - Date.parse(iso)) / (24 * HOUR);
}

/** The checklist behind the score: what a new contributor would want to know. */
export function healthChecks(health: RepoHealth, now: number = Date.now()): HealthCheck[] {
  const { repo, files, pulls, issues, weeklyCommits, topContributorShare, latestRelease } = health;
  const recentCommits = weeklyCommits ? weeklyCommits.slice(-4).reduce((a, b) => a + b, 0) : null;
  const pushedDays = since(repo.pushed_at, now);
  const mergeDays = pulls?.medianMergeHours != null ? pulls.medianMergeHours / 24 : null;
  const fmtDays = (days: number) => (days < 1 ? 'under a day' : `${Math.round(days)} day${Math.round(days) === 1 ? '' : 's'}`);

  return [
    {
      id: 'contributing',
      label: 'Contributing guide',
      ok: files ? files.contributing : null,
      detail: files?.contributing ? 'Tells you how to set up and submit changes.' : 'No CONTRIBUTING file; read past pull requests for conventions.',
    },
    {
      id: 'conduct',
      label: 'Code of conduct',
      ok: files ? files.codeOfConduct : null,
      detail: files?.codeOfConduct ? 'Sets expectations for behaviour.' : 'No code of conduct published.',
    },
    {
      id: 'license',
      label: 'Open source license',
      ok: Boolean(repo.license) || (files ? files.license : null),
      detail: repo.license ? `${repo.license.spdx_id === 'NOASSERTION' ? repo.license.name : repo.license.spdx_id}.` : 'No license detected: reuse rights are unclear.',
    },
    {
      id: 'templates',
      label: 'Issue or pull request templates',
      ok: files ? files.issueTemplate || files.pullRequestTemplate : null,
      detail: files && (files.issueTemplate || files.pullRequestTemplate) ? 'Reports and changes follow a known shape.' : 'No templates.',
    },
    {
      id: 'good-first',
      label: 'Open good first issues',
      ok: issues.goodFirstUnassigned == null ? null : issues.goodFirstUnassigned > 0,
      detail:
        issues.goodFirstUnassigned == null
          ? 'GitHub search was unavailable.'
          : issues.goodFirstUnassigned > 0
            ? `${issues.goodFirstUnassigned} unassigned, ready to pick up.`
            : 'None open and unassigned right now.',
    },
    {
      id: 'active',
      label: 'Recently active',
      ok: recentCommits != null ? recentCommits > 0 : pushedDays <= 30,
      detail:
        recentCommits != null
          ? `${recentCommits} commit${recentCommits === 1 ? '' : 's'} in the last four weeks.`
          : `Last push ${fmtDays(pushedDays)} ago.`,
    },
    {
      id: 'merges',
      label: 'Pull requests get merged',
      ok: pulls ? pulls.closedRecently > 0 && pulls.mergedRecently / pulls.closedRecently >= 0.5 : null,
      detail: pulls
        ? `${pulls.mergedRecently} of the last ${pulls.closedRecently} closed pull requests were merged.`
        : 'Pull request history unavailable.',
    },
    {
      id: 'merge-speed',
      label: 'Reviews within a week',
      ok: mergeDays == null ? null : mergeDays <= 7,
      detail: mergeDays == null ? 'Not enough merged pull requests to tell.' : `Median time to merge: ${fmtDays(mergeDays)}.`,
    },
    {
      id: 'bus-factor',
      label: 'More than one maintainer',
      ok: topContributorShare == null ? null : topContributorShare < 0.75,
      detail:
        topContributorShare == null
          ? 'Contributor list unavailable.'
          : `Top contributor made ${Math.round(topContributorShare * 100)}% of the commits counted.`,
    },
    {
      id: 'releases',
      label: 'Released in the last six months',
      ok: latestRelease ? since(latestRelease.date, now) <= 183 : false,
      detail: latestRelease ? `${latestRelease.tag}, ${fmtDays(since(latestRelease.date, now))} ago.` : 'No published releases.',
    },
  ];
}

/** Share of the checks GitHub let us judge that pass, 0–100. */
export function healthScore(checks: HealthCheck[]): number | null {
  const judged = checks.filter(check => check.ok !== null);
  if (judged.length < 4) return null;
  return Math.round((judged.filter(check => check.ok).length / judged.length) * 100);
}
