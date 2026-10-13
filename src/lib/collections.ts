import 'server-only';

/**
 * Domain collections (AI agent frameworks, databases, CSS frameworks…)
 * curated by OSS Insight and served by its free public API. Membership comes
 * from there; live figures for the members come from GitHub.
 */
const API = 'https://api.ossinsight.io/v1/collections';
/** OSS Insight's older endpoints, which kept answering when the v1 API returned errors (13 October 2026). */
const LEGACY_API = 'https://api.ossinsight.io/collections';
export const COLLECTIONS_SOURCE = 'https://ossinsight.io/collections';

export interface Collection {
  id: string;
  name: string;
}

async function fetchRows(url: string, pick: (data: unknown) => unknown): Promise<Array<Record<string, unknown>>> {
  try {
    const response = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return [];
    const rows = pick(await response.json());
    return Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
  } catch {
    return [];
  }
}

/** Rows from the v1 API ({ data: { rows } }), or from the older one ({ data: [...] }) when v1 has none. */
async function rows(path: string): Promise<Array<Record<string, unknown>>> {
  const current = await fetchRows(`${API}${path}`, data => (data as { data?: { rows?: unknown } } | null)?.data?.rows);
  if (current.length) return current;
  // The older API serves a collection's members at /{id}/ rather than /{id}/repos/.
  return fetchRows(`${LEGACY_API}${path.replace(/^\/(\d+)\/repos\/$/, '/$1/')}`, data => (data as { data?: unknown } | null)?.data);
}

export async function getCollections(): Promise<Collection[]> {
  return (await rows('/'))
    .filter(row => row.public !== 0)
    .map(row => ({ id: String(row.id ?? ''), name: String(row.name ?? '').trim() }))
    .filter(c => /^\d+$/.test(c.id) && c.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** owner/name of every member, in OSS Insight's order. */
export async function getCollectionRepos(id: string): Promise<string[]> {
  if (!/^\d+$/.test(id)) return [];
  return (await rows(`/${id}/repos/`))
    .map(row => String(row.repo_name ?? ''))
    .filter(name => /^[\w.-]+\/[\w.-]+$/.test(name));
}

export function collectionSlug(collection: Collection) {
  return `${collection.id}-${collection.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}
