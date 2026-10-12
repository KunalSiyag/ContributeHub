import 'server-only';

/**
 * Domain collections (AI agent frameworks, databases, CSS frameworks…)
 * curated by OSS Insight and served by its free public API. Membership comes
 * from there; live figures for the members come from GitHub.
 */
const API = 'https://api.ossinsight.io/v1/collections';
export const COLLECTIONS_SOURCE = 'https://ossinsight.io/collections';

export interface Collection {
  id: string;
  name: string;
}

async function rows(path: string): Promise<Array<Record<string, unknown>>> {
  try {
    const response = await fetch(`${API}${path}`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return [];
    const data = (await response.json()) as { data?: { rows?: unknown } };
    return Array.isArray(data?.data?.rows) ? (data.data.rows as Array<Record<string, unknown>>) : [];
  } catch {
    return [];
  }
}

export async function getCollections(): Promise<Collection[]> {
  return (await rows('/'))
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
