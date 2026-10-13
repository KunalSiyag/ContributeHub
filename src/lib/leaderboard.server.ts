import 'server-only';
import { countIssues } from './github';
import { createAnonClient, createClient, isSupabaseConfigured } from './supabase/server';

export interface LeaderboardEntry {
  login: string;
  name: string;
  avatarUrl: string | null;
  /** Pull requests merged in the last 30 days; null when GitHub couldn't be asked. */
  merged: number | null;
  /** All time, from GitHub's GraphQL API (needs GITHUB_TOKEN); null otherwise. */
  mergedAll: number | null;
  pullRequests: number | null;
  issues: number | null;
  /** Signed in with this GitHub account (migration 10); false before it or otherwise. */
  verified: boolean;
}

export type LeaderboardState = 'ready' | 'not-configured' | 'not-set-up' | 'unavailable';
export type LeaderboardWindow = 'month' | 'all';

/** First day of the 30-day window, as GitHub's merged: qualifier wants it. */
export function windowStart(now: Date = new Date()) {
  return new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
}

/** Highest first for the chosen window; members GitHub couldn't count go last, then alphabetical. */
export function rankEntries(entries: LeaderboardEntry[], by: LeaderboardWindow = 'month'): LeaderboardEntry[] {
  const score = (entry: LeaderboardEntry) => (by === 'all' ? entry.mergedAll : entry.merged) ?? -1;
  return [...entries].sort((a, b) => score(b) - score(a) || a.login.localeCompare(b.login));
}

const LOGIN = /^[A-Za-z0-9-]{1,39}$/;
const BATCH = 20;

/** The GraphQL query for one batch: an aliased search and user lookup per member. */
export function statsQuery(count: number) {
  const vars = Array.from({ length: count }, (_, i) => `$q${i}: String!, $l${i}: String!`).join(', ');
  const fields = Array.from(
    { length: count },
    (_, i) =>
      `m${i}: search(query: $q${i}, type: ISSUE, first: 1) { issueCount } u${i}: user(login: $l${i}) { mergedAll: pullRequests(states: MERGED) { totalCount } pullRequests { totalCount } issues { totalCount } }`
  ).join(' ');
  return `query(${vars}) { ${fields} }`;
}

type Stats = Pick<LeaderboardEntry, 'merged' | 'mergedAll' | 'pullRequests' | 'issues'>;

/** Four figures per member in one GraphQL request per twenty members; null when there's no token or GitHub fails. */
async function viaGraphQL(logins: string[], since: string): Promise<Map<string, Stats> | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  const stats = new Map<string, Stats>();
  for (let start = 0; start < logins.length; start += BATCH) {
    const batch = logins.slice(start, start + BATCH);
    const variables = Object.fromEntries(batch.flatMap((login, i) => [[`q${i}`, `author:${login} is:pr is:merged merged:>=${since}`], [`l${i}`, login]]));
    try {
      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'orion-open-source-hub' },
        body: JSON.stringify({ query: statsQuery(batch.length), variables }),
        next: { revalidate: 21600 },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) return null;
      const { data } = (await response.json()) as { data?: Record<string, { issueCount?: number; mergedAll?: { totalCount: number }; pullRequests?: { totalCount: number }; issues?: { totalCount: number } } | null> };
      batch.forEach((login, i) => {
        const user = data?.[`u${i}`];
        stats.set(login.toLowerCase(), {
          merged: data?.[`m${i}`]?.issueCount ?? null,
          mergedAll: user?.mergedAll?.totalCount ?? null,
          pullRequests: user?.pullRequests?.totalCount ?? null,
          issues: user?.issues?.totalCount ?? null,
        });
      });
    } catch {
      return null;
    }
  }
  return stats;
}

/**
 * Members who opted in (migration 07's leaderboard_members()), with pull
 * requests merged in the last 30 days and, when a GitHub token is set, all
 * time figures too. Counts are cached for six hours.
 */
export async function getLeaderboard(by: LeaderboardWindow = 'month'): Promise<{ state: LeaderboardState; entries: LeaderboardEntry[]; allTime: boolean }> {
  if (!isSupabaseConfigured()) return { state: 'not-configured', entries: [], allTime: false };
  const { data, error } = await createAnonClient().rpc('leaderboard_members');
  if (error) {
    const missing = error.code === 'PGRST202' || error.code === '42883';
    return { state: missing ? 'not-set-up' : 'unavailable', entries: [], allTime: false };
  }
  const members = (data ?? []).filter(member => LOGIN.test(member.github_username)).slice(0, 200);
  const since = windowStart();
  const graph = await viaGraphQL(
    members.map(member => member.github_username),
    since
  );
  const entries = await Promise.all(
    members.map(async member => {
      const stats = graph?.get(member.github_username.toLowerCase());
      return {
        login: member.github_username,
        name: member.display_name,
        avatarUrl: member.avatar_url,
        merged: stats ? stats.merged : await countIssues(`author:${member.github_username} is:pr is:merged merged:>=${since}`, 21600),
        mergedAll: stats?.mergedAll ?? null,
        pullRequests: stats?.pullRequests ?? null,
        issues: stats?.issues ?? null,
        verified: Boolean(member.verified),
      };
    })
  );
  return { state: 'ready', entries: rankEntries(entries, by), allTime: graph !== null };
}

export interface Standing {
  login: string;
  /** On the leaderboard now, or where they would be. */
  onBoard: boolean;
  rank: number;
  merged: number | null;
  total: number;
}

/** Where a figure would place among the board's entries (ties share the better rank). */
export function rankFor(value: number | null, entries: LeaderboardEntry[], by: LeaderboardWindow = 'month') {
  const score = (entry: LeaderboardEntry) => (by === 'all' ? entry.mergedAll : entry.merged) ?? -1;
  return 1 + entries.filter(entry => score(entry) > (value ?? -1)).length;
}

/** "You vs the board" for the signed-in member: their rank, or where they would be if they joined. */
export async function getMyStanding(entries: LeaderboardEntry[], by: LeaderboardWindow): Promise<Standing | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('github_username').eq('id', user.id).maybeSingle();
  const login = profile?.github_username;
  if (!login || !LOGIN.test(login)) return null;
  const mine = entries.findIndex(entry => entry.login.toLowerCase() === login.toLowerCase());
  if (mine >= 0) return { login, onBoard: true, rank: mine + 1, merged: by === 'all' ? entries[mine].mergedAll : entries[mine].merged, total: entries.length };
  if (by === 'all') return { login, onBoard: false, rank: 0, merged: null, total: entries.length };
  const merged = await countIssues(`author:${login} is:pr is:merged merged:>=${windowStart()}`, 21600);
  return { login, onBoard: false, rank: rankFor(merged, entries, by), merged, total: entries.length + 1 };
}
