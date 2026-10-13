'use client';

import { useEffect, useRef, useState } from 'react';
import type { ApiErrorBody } from '@/lib/api';
import type { EnrichedOrganization } from '@/lib/organizations';

/* ------------------------------------------------------------------ */
/* Fetching                                                            */
/* ------------------------------------------------------------------ */

const NETWORK_MESSAGE = 'Orion could not be reached. Check your connection and try again.';
const GENERIC_MESSAGE = 'Results could not be loaded. Try again.';

class RequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestError';
  }
}

/** GET a JSON API route. Errors carry the route's `message` (e.g. GitHub rate limits). */
async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new RequestError(NETWORK_MESSAGE);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch (error) {
    if (signal?.aborted) throw error;
  }

  if (!response.ok) {
    const message = (body as Partial<ApiErrorBody> | null)?.message;
    throw new RequestError(typeof message === 'string' && message ? message : GENERIC_MESSAGE);
  }
  if (body === null || typeof body !== 'object') throw new RequestError(GENERIC_MESSAGE);
  return body as T;
}

function messageOf(error: unknown): string {
  return error instanceof RequestError ? error.message : GENERIC_MESSAGE;
}

/* ------------------------------------------------------------------ */
/* Paged GitHub search (issues, repositories)                          */
/* ------------------------------------------------------------------ */

interface SearchPage<T> {
  items?: T[];
  total_count?: number;
  query?: string;
}

interface Loaded<T> {
  /** Request params + attempt these results belong to. */
  key: string;
  items: T[];
  total: number;
  query: string;
  page: number;
  /** GitHub returned an empty page; nothing further to request. */
  exhausted: boolean;
}

interface MoreState {
  key: string;
  loading: boolean;
  message: string | null;
}

export interface SearchResults<T> {
  /** Results for the current filters, or null while they load / after an error. */
  data: Loaded<T> | null;
  /** Previous results kept on screen (dimmed) while new filters load. */
  stale: Loaded<T> | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  /** Reached the last page the API serves while GitHub reports more results. */
  capped: boolean;
  loadingMore: boolean;
  moreError: string | null;
  loadMore: () => void;
  retry: () => void;
}

function uniqueById<T extends { id: number }>(items: T[], seen = new Set<number>()): T[] {
  const result: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

/**
 * First page loads whenever `params` change while `enabled`; results stay in
 * state when the tab is hidden, so switching back is instant. Responses for
 * superseded params are aborted or ignored.
 */
export function useSearchResults<T extends { id: number }>(
  endpoint: string,
  params: string,
  { enabled, maxPage }: { enabled: boolean; maxPage: number }
): SearchResults<T> {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [more, setMore] = useState<MoreState | null>(null);
  const loadedKey = useRef<string | null>(null);

  const key = `${params}#${attempt}`;

  useEffect(() => {
    if (!enabled || loadedKey.current === key) return;
    const controller = new AbortController();

    getJson<SearchPage<T>>(`${endpoint}?${params}&page=1`, controller.signal).then(
      data => {
        if (controller.signal.aborted) return;
        const items = uniqueById(Array.isArray(data.items) ? data.items : []);
        const total = Math.max(typeof data.total_count === 'number' ? data.total_count : 0, items.length);
        loadedKey.current = key;
        setLoaded({ key, items, total, query: typeof data.query === 'string' ? data.query : '', page: 1, exhausted: items.length === 0 });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        loadedKey.current = null;
        setLoaded(null);
        setFailure({ key, message: messageOf(error) });
      }
    );

    return () => controller.abort();
  }, [enabled, endpoint, params, key]);

  const data = loaded && loaded.key === key ? loaded : null;
  const error = failure && failure.key === key ? failure.message : null;
  const loading = enabled && !data && !error;
  const moreState = data && more && more.key === data.key ? more : null;

  const loadMore = () => {
    if (!data || data.exhausted || moreState?.loading) return;
    const { key: resultKey, page } = data;
    const nextPage = page + 1;
    setMore({ key: resultKey, loading: true, message: null });

    getJson<SearchPage<T>>(`${endpoint}?${params}&page=${nextPage}`).then(
      response => {
        const incoming = Array.isArray(response.items) ? response.items : [];
        setLoaded(previous => {
          // Filters changed, or this page already landed: drop the response.
          if (!previous || previous.key !== resultKey || previous.page !== page) return previous;
          // Results shift while people file issues, so pages can overlap.
          const fresh = uniqueById(incoming, new Set(previous.items.map(item => item.id)));
          return { ...previous, items: [...previous.items, ...fresh], page: nextPage, exhausted: incoming.length === 0 };
        });
        setMore(previous => (previous?.key === resultKey ? null : previous));
      },
      (failed: unknown) => {
        setMore(previous =>
          previous?.key === resultKey ? { key: resultKey, loading: false, message: messageOf(failed) } : previous
        );
      }
    );
  };

  const canRequestMore = Boolean(data && !data.exhausted && data.items.length < data.total);

  return {
    data,
    stale: loading && loaded ? loaded : null,
    loading,
    error,
    hasMore: canRequestMore && (data?.page ?? maxPage) < maxPage,
    capped: canRequestMore && (data?.page ?? 0) >= maxPage,
    loadingMore: Boolean(moreState?.loading),
    moreError: moreState?.message ?? null,
    loadMore,
    retry: () => setAttempt(value => value + 1),
  };
}

/* ------------------------------------------------------------------ */
/* Organizations (one request per mount, filtered on the client)       */
/* ------------------------------------------------------------------ */

export interface OrganizationsMeta {
  liveCount: number;
  total: number;
  /** Organizations with a GitHub repository (live stats can only cover these). */
  repoCount: number;
  rateLimited: boolean;
  fetchedAt?: string;
}

interface OrganizationsResponse {
  organizations?: EnrichedOrganization[];
  meta?: Partial<OrganizationsMeta>;
}

export interface OrganizationsData {
  organizations: EnrichedOrganization[];
  meta: OrganizationsMeta;
}

export function useOrganizations(enabled: boolean) {
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<OrganizationsData | null>(null);
  const [failure, setFailure] = useState<{ attempt: number; message: string } | null>(null);

  useEffect(() => {
    if (!enabled || data) return;
    const controller = new AbortController();

    getJson<OrganizationsResponse>('/api/organizations', controller.signal).then(
      response => {
        if (controller.signal.aborted) return;
        const organizations = Array.isArray(response.organizations) ? response.organizations : [];
        const meta = response.meta ?? {};
        setData({
          organizations,
          meta: {
            liveCount: typeof meta.liveCount === 'number' ? meta.liveCount : organizations.filter(org => org.live).length,
            total: typeof meta.total === 'number' ? meta.total : organizations.length,
            repoCount:
              typeof meta.repoCount === 'number' ? meta.repoCount : organizations.filter(org => org.slug.includes('/')).length,
            rateLimited: Boolean(meta.rateLimited),
            fetchedAt: meta.fetchedAt,
          },
        });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setFailure({ attempt, message: messageOf(error) });
      }
    );

    return () => controller.abort();
  }, [enabled, data, attempt]);

  const error = !data && failure && failure.attempt === attempt ? failure.message : null;

  return {
    data,
    loading: enabled && !data && !error,
    error,
    retry: () => setAttempt(value => value + 1),
  };
}
