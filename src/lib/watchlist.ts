const REPO = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;
export const WATCHLIST_MAX_REPOS = 12;

export interface WatchlistParams {
  repos: string[];
  labels: string[];
  unassigned: boolean;
}

/** Reads ?repos=a/b,c/d&labels=good first issue&unassigned=1, dropping anything invalid. */
export function readWatchlistParams(params: URLSearchParams): WatchlistParams {
  const list = (key: string) =>
    (params.get(key) ?? '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);
  return {
    repos: Array.from(new Set(list('repos').filter(repo => REPO.test(repo)))).slice(0, WATCHLIST_MAX_REPOS),
    labels: list('labels')
      .filter(label => label.length <= 50 && !/["\\]/.test(label))
      .slice(0, 3),
    unassigned: params.get('unassigned') === '1',
  };
}

/** One GitHub search: repo qualifiers OR together, labels AND together. */
export function watchlistQuery({ repos, labels, unassigned }: WatchlistParams): string {
  return [
    ...repos.map(repo => `repo:${repo}`),
    'is:issue is:open',
    ...labels.map(label => `label:"${label}"`),
    unassigned && 'no:assignee',
  ]
    .filter(Boolean)
    .join(' ');
}

export function watchlistSearch({ repos, labels, unassigned }: WatchlistParams): string {
  const search = new URLSearchParams({ repos: repos.join(',') });
  if (labels.length) search.set('labels', labels.join(','));
  if (unassigned) search.set('unassigned', '1');
  return search.toString();
}

/** A small, stable hash (FNV-1a) for picking things by date. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * One issue for the day, as CodeTriage sends: the same all day, a different
 * one tomorrow, and unchanged when newer issues arrive (it depends on the
 * issue, not its position in the list).
 */
export function dailyPick<T extends { id: number }>(items: T[], day: string): T | undefined {
  let best: T | undefined;
  let bestScore = Infinity;
  for (const item of items) {
    const score = hash(`${day}:${item.id}`);
    if (score < bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return best;
}
