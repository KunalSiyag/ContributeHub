// Bounty parsing and stats. Pure functions only (unit tested); fetching
// lives in bounties.server.ts.

export interface BountyIssue {
  id: string;
  number: number;
  title: string;
  repo: string;
  url: string;
  /** Display amount, e.g. "$1,340", or "Bounty" when no amount is stated. */
  bountyAmount: string;
  /** Numeric amount in USD for sorting; 0 when unknown. */
  bountyValue: number;
  source: 'github' | 'algora';
  labels: string[];
  createdAt: string;
  updatedAt?: string;
  assignees: number;
  comments: number;
  /** GitHub stars of the repository that pays; undefined when unknown. */
  repoStars?: number;
}

export type BountySource = 'all' | 'github' | 'algora';
export const BOUNTY_SOURCES: readonly BountySource[] = ['all', 'github', 'algora'];

const AMOUNT_PATTERNS = [/\$\s?([\d][\d,]*(?:\.\d{2})?)/, /([\d][\d,]*)\s?(?:usd|usdc|usdt)\b/i];

export function parseBountyAmount(text: string): { amount: string; value: number } | null {
  if (!text) return null;
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(value) && value >= 5 && value <= 100_000) {
        return { amount: `$${Number(value).toLocaleString('en-US')}`, value };
      }
    }
  }
  return null;
}

export interface RawSearchIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  repository_url: string;
  labels: Array<{ name: string }>;
  created_at: string;
  updated_at: string;
  comments: number;
  assignees?: unknown[];
  pull_request?: unknown;
}

function repoFromUrl(repositoryUrl: string): string {
  const parts = repositoryUrl.split('/');
  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

/** Turn a GitHub search hit into a bounty, or null if nothing marks it as one. */
export function normalizeBountyIssue(issue: RawSearchIssue): BountyIssue | null {
  const labels = issue.labels?.map(l => l.name) || [];
  const labelText = labels.join(' ');
  const body = issue.body?.slice(0, 800) || '';
  const searchableText = `${issue.title} ${labelText} ${body}`;

  const parsed = parseBountyAmount(labelText) || parseBountyAmount(issue.title) || parseBountyAmount(body);
  const hasBountyLabel = /bounty|\u{1F4B0}|reward|paid|funded/u.test(labelText.toLowerCase());
  const isAlgora = /algora\.io/i.test(searchableText);

  // Require an explicit dollar amount or a strong bounty label.
  if (!parsed && !hasBountyLabel) return null;

  return {
    id: `gh-${issue.id}`,
    number: issue.number,
    title: issue.title,
    repo: repoFromUrl(issue.repository_url),
    url: issue.html_url,
    bountyAmount: parsed?.amount || 'Bounty',
    bountyValue: parsed?.value || 0,
    source: isAlgora ? 'algora' : 'github',
    labels,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    assignees: issue.assignees?.length || 0,
    comments: issue.comments ?? 0,
  };
}

export interface BountyStats {
  totalPool: number;
  count: number;
  unclaimedCount: number;
  topRepo: string | null;
}

/** Repos that collect other projects' bounties (e.g. "bounty-plaza", "awesome-agent-bounties"). */
const AGGREGATOR_REPO = /\/(?:awesome-[\w.-]*bount[\w.-]*|bount(?:y|ies)[-_]?(?:plaza|board|hub|list|market|feed|aggregator)s?)$/i;
/** Re-posts wrap the original title in an extra tag: "[Bounty] [Bounty $3000] …". */
const REPOSTED_TITLE = /^\[bounty\]\s*\[/i;

/**
 * True for listings that re-post someone else's bounty. They send
 * contributors to a copy instead of the project that pays, so Orion skips them.
 */
export function isRepostedListing(bounty: Pick<BountyIssue, 'repo' | 'title'>): boolean {
  return AGGREGATOR_REPO.test(bounty.repo) || REPOSTED_TITLE.test(bounty.title.trim());
}

/** Repositories under this many stars are new or unproven; their bounties are hidden by default. */
export const ESTABLISHED_STARS = 10;

/** Unknown star counts count as established, so a failed lookup never hides bounties. */
export function isEstablished(bounty: Pick<BountyIssue, 'repoStars'>): boolean {
  return bounty.repoStars === undefined || bounty.repoStars >= ESTABLISHED_STARS;
}

/** Showcase picks: established repositories, one bounty each, largest reward first. */
export function featuredBounties(list: BountyIssue[], count = 4): BountyIssue[] {
  const seen = new Set<string>();
  const picked: BountyIssue[] = [];
  for (const bounty of sortBounties(list.filter(isEstablished), 'amount')) {
    if (seen.has(bounty.repo.toLowerCase())) continue;
    seen.add(bounty.repo.toLowerCase());
    picked.push(bounty);
    if (picked.length === count) break;
  }
  return picked;
}

export function computeBountyStats(bounties: BountyIssue[]): BountyStats {
  const totalPool = bounties.reduce((sum, b) => sum + b.bountyValue, 0);
  const repoTotals = new Map<string, number>();
  bounties.forEach(b => {
    if (b.bountyValue > 0) repoTotals.set(b.repo, (repoTotals.get(b.repo) || 0) + b.bountyValue);
  });
  const topRepo = [...repoTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    totalPool,
    count: bounties.length,
    unclaimedCount: bounties.filter(b => b.assignees === 0).length,
    topRepo,
  };
}

export function sortBounties(list: BountyIssue[], by: 'amount' | 'recent' | 'comments' = 'amount'): BountyIssue[] {
  return [...list].sort((a, b) => {
    if (by === 'amount' && (a.bountyValue > 0 || b.bountyValue > 0)) return b.bountyValue - a.bountyValue;
    if (by === 'comments' && a.comments !== b.comments) return b.comments - a.comments;
    return (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt);
  });
}
