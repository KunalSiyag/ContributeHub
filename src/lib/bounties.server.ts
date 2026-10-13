import 'server-only';
import { GitHubError, searchIssues, searchRepositories } from './github';
import {
  isRepostedListing,
  normalizeBountyIssue,
  sortBounties,
  type BountyIssue,
  type BountySource,
  type RawSearchIssue,
} from './bounties';

const BOUNTY_QUERIES = [
  'is:issue is:open archived:false label:bounty',
  'is:issue is:open archived:false label:"💰"',
  'is:issue is:open archived:false algora.io in:body bounty',
];

/**
 * Stars per repository from batched `repo:` searches, cached for hours.
 * Repositories missing from the map are unknown, never treated as zero.
 */
async function repoStars(repos: string[]): Promise<Map<string, number>> {
  const stars = new Map<string, number>();
  const BATCH = 40;
  for (let i = 0; i < Math.min(repos.length, 120); i += BATCH) {
    try {
      const result = await searchRepositories(repos.slice(i, i + BATCH).map(repo => `repo:${repo}`).join(' '), {
        perPage: 100,
        revalidate: 6 * 3600,
      });
      for (const repo of result.items) stars.set(repo.full_name.toLowerCase(), repo.stargazers_count);
    } catch {
      // Rate limited or unavailable: those repositories stay unknown.
    }
  }
  return stars;
}

export interface BountyResult {
  bounties: BountyIssue[];
  /** True when at least one source failed (results may be incomplete). */
  partial: boolean;
}

/**
 * Live bounties from GitHub search. Throws a GitHubError only when every
 * source fails, so callers can tell "no bounties" from "GitHub unavailable".
 */
export async function fetchBounties({
  source = 'all',
  language,
  limit = 40,
}: { source?: BountySource; language?: string; limit?: number } = {}): Promise<BountyResult> {
  const languageFilter = language ? ` language:"${language.replace(/"/g, '')}"` : '';
  const settled = await Promise.allSettled(
    BOUNTY_QUERIES.map(q =>
      searchIssues(`${q}${languageFilter}`, { sort: 'updated', perPage: 40, revalidate: 1800 })
    )
  );

  const failures = settled.filter((s): s is PromiseRejectedResult => s.status === 'rejected');
  if (failures.length === settled.length) {
    const reason = failures[0].reason;
    throw reason instanceof GitHubError ? reason : new GitHubError(502, 'Bounty sources unavailable.');
  }

  const byId = new Map<string, BountyIssue>();
  for (const outcome of settled) {
    if (outcome.status !== 'fulfilled') continue;
    for (const item of outcome.value.items as unknown as RawSearchIssue[]) {
      const bounty = normalizeBountyIssue(item);
      if (bounty && !isRepostedListing(bounty) && !byId.has(bounty.id)) byId.set(bounty.id, bounty);
    }
  }

  // Bounties nobody has touched in ~9 months are almost always abandoned.
  const staleBefore = Date.now() - 270 * 86400000;
  let bounties = Array.from(byId.values()).filter(
    b => new Date(b.updatedAt ?? b.createdAt).getTime() >= staleBefore
  );
  if (source !== 'all') bounties = bounties.filter(b => b.source === source);

  const stars = await repoStars(Array.from(new Set(bounties.map(b => b.repo.toLowerCase()))));
  bounties = bounties.map(b => ({ ...b, repoStars: stars.get(b.repo.toLowerCase()) }));

  return { bounties: sortBounties(bounties).slice(0, limit), partial: failures.length > 0 };
}
