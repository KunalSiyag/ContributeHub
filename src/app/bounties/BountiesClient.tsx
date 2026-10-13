'use client';

import { startTransition, useEffect, useId, useMemo, useOptimistic, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import BountyRow from '@/components/BountyRow';
import { IssueRowSkeleton } from '@/components/IssueRow';
import { IconCoins, IconSearch } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { Checkbox, SearchInput, Select, Toolbar, toolbarClasses } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Tabs';
import { EmptyState, Notice } from '@/components/ui/primitives';
import rows from '@/components/rows.module.css';
import { ESTABLISHED_STARS, isEstablished, sortBounties, type BountyIssue, type BountySort, type BountySource } from '@/lib/bounties';
import { POPULAR_LANGUAGES } from '@/lib/matching';
import BountyStats, { summarizeBounties } from './BountyStats';
import { BOUNTY_LIMIT, type BountyLoadError, type BountySet } from './types';
import styles from './page.module.css';

const PAGE_SIZE = 30;
/** Quick successive changes (e.g. arrowing through languages) cost one request. */
const FETCH_DELAY = 300;
/** Automatic retries per result set after a rate limit lifts. */
const MAX_AUTO_RETRIES = 2;

type Sort = BountySort;

interface Filters {
  source: BountySource;
  language: string;
  sort: Sort;
  unclaimed: boolean;
  /** Hide bounties from repositories under ESTABLISHED_STARS stars. */
  established: boolean;
}

type Entry = { status: 'ready'; set: BountySet } | { status: 'error'; error: BountyLoadError };

const SOURCE_LABEL: Record<BountySource, string> = { all: 'All', github: 'GitHub', algora: 'Algora' };
const SOURCE_OPTIONS = (['all', 'github', 'algora'] as const).map(value => ({ value, label: SOURCE_LABEL[value] }));
const SORT_OPTIONS: Array<{ value: BountySort; label: string }> = [
  { value: 'amount', label: 'Highest reward' },
  { value: 'recent', label: 'Recently updated' },
  { value: 'comments', label: 'Most discussed' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

const keyFor = (source: BountySource, language: string) => `${source}|${language.toLowerCase()}`;
const count = (value: number, one: string, many: string) =>
  `${value.toLocaleString('en-US')} ${value === 1 ? one : many}`;

function readFilters(params: { get(name: string): string | null }): Filters {
  const source = params.get('source');
  const language = (params.get('language') ?? '').trim().slice(0, 40);
  return {
    source: source === 'github' || source === 'algora' ? source : 'all',
    language: POPULAR_LANGUAGES.find(known => known.toLowerCase() === language.toLowerCase()) ?? language,
    sort: SORT_OPTIONS.find(option => option.value === params.get('sort'))?.value ?? 'amount',
    unclaimed: params.get('unclaimed') !== '0',
    established: params.get('repos') !== 'all',
  };
}

/** Only non-default values go in the URL. */
function toQuery({ source, language, sort, unclaimed, established }: Filters) {
  const params = new URLSearchParams();
  if (source !== 'all') params.set('source', source);
  if (language) params.set('language', language);
  if (sort !== 'amount') params.set('sort', sort);
  if (!unclaimed) params.set('unclaimed', '0');
  if (!established) params.set('repos', 'all');
  return params.toString();
}

function without(store: Record<string, Entry>, keys: string[]) {
  const next = { ...store };
  for (const key of keys) delete next[key];
  return next;
}

function matchesTerms(bounty: BountyIssue, terms: string[]) {
  if (terms.length === 0) return true;
  const haystack = `${bounty.title} ${bounty.repo} ${bounty.labels.join(' ')}`.toLowerCase();
  return terms.every(term => haystack.includes(term));
}

async function requestBounties(source: BountySource, language: string, signal: AbortSignal): Promise<Entry> {
  const params = new URLSearchParams({ limit: String(BOUNTY_LIMIT) });
  if (source !== 'all') params.set('source', source);
  if (language) params.set('language', language);
  const response = await fetch(`/api/bounties?${params}`, { signal });
  const body = await response.json().catch(() => null);
  if (response.ok && Array.isArray(body?.bounties)) {
    return { status: 'ready', set: { bounties: body.bounties, partial: Boolean(body.partial) } };
  }
  return {
    status: 'error',
    error: {
      message: typeof body?.message === 'string' ? body.message : 'Bounties could not be loaded. Try again.',
      resetAt: typeof body?.resetAt === 'number' ? body.resetAt : undefined,
    },
  };
}

interface BountiesClientProps {
  /** Server-rendered "all sources, all languages" set, or null if it failed. */
  initial: BountySet | null;
  initialError: BountyLoadError | null;
}

export default function BountiesClient({ initial, initialError }: BountiesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchId = useId();

  // The URL owns source, language, sort and unclaimed. Optimistic state keeps
  // the controls instant while router.replace settles.
  const urlFilters = useMemo(() => readFilters(searchParams), [searchParams]);
  const [filters, setOptimisticFilters] = useOptimistic(urlFilters);
  const { source, language } = filters;
  const [query, setQuery] = useState('');

  // Loaded result sets keyed by source|language, seeded with the server render.
  const [store, setStore] = useState<Record<string, Entry>>(() => {
    const key = keyFor('all', '');
    if (initialError) return { [key]: { status: 'error', error: initialError } };
    return initial ? { [key]: { status: 'ready', set: initial } } : {};
  });

  const dataKey = keyFor(source, language);
  const allKey = keyFor('all', language);
  const direct = store[dataKey];
  const allEntry = store[allKey];

  const entry = useMemo<Entry | undefined>(() => {
    if (direct?.status === 'ready') return direct;
    // An "all sources" set that stayed under the limit already holds every
    // source's bounties, so a source switch needs no request (and an older
    // error for this source no longer matters).
    if (source !== 'all' && allEntry?.status === 'ready' && allEntry.set.bounties.length < BOUNTY_LIMIT) {
      return {
        status: 'ready',
        set: {
          bounties: allEntry.set.bounties.filter(bounty => bounty.source === source),
          partial: allEntry.set.partial,
        },
      };
    }
    return direct;
  }, [direct, allEntry, source]);

  const hasEntry = entry !== undefined;

  useEffect(() => {
    if (hasEntry) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      let next: Entry;
      try {
        next = await requestBounties(source, language, controller.signal);
      } catch {
        next = { status: 'error', error: { message: 'Orion could not be reached. Check your connection and try again.' } };
      }
      if (controller.signal.aborted) return;
      setStore(prev => ({ ...prev, [keyFor(source, language)]: next }));
    }, FETCH_DELAY);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [hasEntry, source, language]);

  // A rate-limit error clears itself once GitHub's limit lifts, which lets the
  // effect above make one fresh request. Capped so a bad reset time can't loop.
  const autoRetries = useRef(new Map<string, number>());
  const resetAt = entry?.status === 'error' ? entry.error.resetAt : undefined;

  useEffect(() => {
    if (resetAt === undefined) return;
    const key = keyFor(source, language);
    const attempts = autoRetries.current.get(key) ?? 0;
    if (attempts >= MAX_AUTO_RETRIES) return;
    const wait = resetAt - Date.now();
    const delay = wait <= 0 ? 1000 * (attempts + 1) : Math.min(wait + 2000, 3_600_000);
    const timer = window.setTimeout(() => {
      autoRetries.current.set(key, attempts + 1);
      setStore(prev => without(prev, [key]));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [resetAt, source, language]);

  const update = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    const nextQuery = toQuery(next);
    startTransition(() => {
      setOptimisticFilters(next);
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    });
  };

  const retry = () => setStore(prev => without(prev, [dataKey, allKey]));

  const focusSearch = () => document.getElementById(searchId)?.focus();
  const clearSearch = () => {
    setQuery('');
    focusSearch();
  };

  const set = entry?.status === 'ready' ? entry.set : null;
  const terms = useMemo(() => query.trim().toLowerCase().split(/\s+/).filter(Boolean), [query]);

  const results = useMemo(() => {
    if (!set) return [];
    const kept = set.bounties.filter(
      bounty =>
        (!filters.unclaimed || bounty.assignees === 0) &&
        (!filters.established || isEstablished(bounty)) &&
        matchesTerms(bounty, terms)
    );
    return sortBounties(kept, filters.sort);
  }, [set, terms, filters.unclaimed, filters.established, filters.sort]);

  // Totals follow the repository filter so new repositories can't inflate them.
  const summary = useMemo(
    () => (set ? summarizeBounties(filters.established ? set.bounties.filter(isEstablished) : set.bounties) : null),
    [set, filters.established]
  );

  // Paging resets whenever the list itself changes.
  const listKey = `${dataKey}|${filters.sort}|${filters.unclaimed ? 1 : 0}|${filters.established ? 1 : 0}|${terms.join(' ')}`;
  const [paging, setPaging] = useState({ key: listKey, size: PAGE_SIZE });
  const visibleCount = paging.key === listKey ? paging.size : PAGE_SIZE;
  const remaining = Math.max(0, results.length - visibleCount);

  // After "Show more", move focus to the first newly revealed bounty.
  const listRef = useRef<HTMLUListElement>(null);
  const focusIndex = useRef<number | null>(null);

  useEffect(() => {
    const index = focusIndex.current;
    if (index === null) return;
    focusIndex.current = null;
    listRef.current?.children[index]?.querySelector<HTMLElement>(`.${CSS.escape(rows.stretch)}`)?.focus();
  }, [visibleCount]);

  const showMore = () => {
    focusIndex.current = visibleCount;
    setPaging({ key: listKey, size: visibleCount + PAGE_SIZE });
  };

  const languageOptions = useMemo(() => {
    const options = [
      { value: '', label: 'All languages' },
      ...POPULAR_LANGUAGES.map(name => ({ value: name, label: name })),
    ];
    if (language && !POPULAR_LANGUAGES.includes(language)) options.push({ value: language, label: language });
    return options;
  }, [language]);

  const loading = !entry;
  const countText = loading ? 'Loading bounties…' : set ? count(results.length, 'bounty', 'bounties') : '';

  let content: ReactNode;
  if (!entry) {
    content = <IssueRowSkeleton count={8} />;
  } else if (entry.status === 'error') {
    content = (
      <Notice
        tone="warning"
        title="Bounties could not be loaded"
        action={
          <Button size="sm" onClick={retry}>
            Retry
          </Button>
        }
      >
        {entry.error.message}
      </Notice>
    );
  } else if (entry.set.bounties.length === 0) {
    const sourceLabel = SOURCE_LABEL[source];
    const title =
      language && source !== 'all'
        ? `No ${language} bounties on ${sourceLabel} right now`
        : language
          ? `No ${language} bounties right now`
          : source !== 'all'
            ? `No ${sourceLabel} bounties right now`
            : 'No open bounties right now';
    content = (
      <EmptyState
        className={styles.emptyPanel}
        icon={<IconCoins size={16} />}
        title={title}
        action={
          (language || source !== 'all') && (
            <>
              {language && (
                <Button variant="secondary" onClick={() => update({ language: '' })}>
                  Show all languages
                </Button>
              )}
              {source !== 'all' && (
                <Button variant={language ? 'ghost' : 'secondary'} onClick={() => update({ source: 'all' })}>
                  Show all sources
                </Button>
              )}
            </>
          )
        }
      >
        GitHub search returned no open issues with a bounty label or a stated reward
        {language || source !== 'all' ? ' for this filter' : ''}.
      </EmptyState>
    );
  } else if (results.length === 0) {
    const trimmed = query.trim();
    const hiddenAssigned = filters.unclaimed
      ? entry.set.bounties.filter(bounty => bounty.assignees > 0 && matchesTerms(bounty, terms)).length
      : 0;
    const hiddenNew = filters.established
      ? entry.set.bounties.filter(
          bounty => !isEstablished(bounty) && (!filters.unclaimed || bounty.assignees === 0) && matchesTerms(bounty, terms)
        ).length
      : 0;
    content =
      hiddenNew > 0 && hiddenAssigned === 0 ? (
        <EmptyState
          className={styles.emptyPanel}
          icon={<IconSearch size={16} />}
          title={trimmed ? `Only new repositories match “${trimmed}”` : 'Only new repositories have bounties here'}
          action={
            <Button variant="secondary" onClick={() => update({ established: false })}>
              Include new repositories
            </Button>
          }
        >
          {count(hiddenNew, 'bounty comes', 'bounties come')} from repositories with fewer than {ESTABLISHED_STARS} stars.
        </EmptyState>
      ) : hiddenAssigned > 0 ? (
        <EmptyState
          className={styles.emptyPanel}
          icon={<IconSearch size={16} />}
          title={trimmed ? `Only assigned bounties match “${trimmed}”` : 'Every bounty here is already assigned'}
          action={
            <>
              <Button variant="secondary" onClick={() => update({ unclaimed: false })}>
                Include assigned
              </Button>
              {trimmed && (
                <Button variant="ghost" onClick={clearSearch}>
                  Clear search
                </Button>
              )}
            </>
          }
        >
          {count(hiddenAssigned, 'bounty has', 'bounties have')} an assignee on GitHub.
        </EmptyState>
      ) : (
        <EmptyState
          className={styles.emptyPanel}
          icon={<IconSearch size={16} />}
          title={`No bounties match “${trimmed}”`}
          action={
            <Button variant="secondary" onClick={clearSearch}>
              Clear search
            </Button>
          }
        >
          Search looks at titles, repository names and labels.
        </EmptyState>
      );
  } else {
    content = (
      <>
        <ul ref={listRef} className={rows.list}>
          {results.slice(0, visibleCount).map(bounty => (
            <BountyRow key={bounty.id} bounty={bounty} />
          ))}
        </ul>
        {remaining > 0 && (
          <div className={styles.more}>
            <Button variant="secondary" onClick={showMore}>
              Show {Math.min(PAGE_SIZE, remaining)} more
            </Button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className={styles.root}>
      <BountyStats summary={summary} loading={loading} />

      <Toolbar className={styles.toolbar}>
        <SearchInput
          id={searchId}
          value={query}
          onValueChange={setQuery}
          placeholder="Filter by title, repository or label…"
          aria-label="Filter bounties"
          wrapperClassName={`${toolbarClasses.grow} ${styles.search}`}
        />
        <Segmented label="Source" options={SOURCE_OPTIONS} value={source} onChange={next => update({ source: next })} />
        <Select
          aria-label="Language"
          options={languageOptions}
          value={language}
          onChange={event => update({ language: event.target.value })}
          wrapperClassName={styles.select}
        />
        <Select
          aria-label="Sort bounties"
          options={SORT_OPTIONS}
          value={filters.sort}
          onChange={event => update({ sort: SORT_OPTIONS.find(option => option.value === event.target.value)?.value ?? 'amount' })}
          wrapperClassName={styles.select}
        />
        <Checkbox
          label="Unclaimed only"
          checked={filters.unclaimed}
          onChange={event => update({ unclaimed: event.target.checked })}
          className={styles.unclaimed}
        />
        <Checkbox
          label="Established repos only"
          title={`Hides bounties from repositories with fewer than ${ESTABLISHED_STARS} GitHub stars`}
          checked={filters.established}
          onChange={event => update({ established: event.target.checked })}
        />
      </Toolbar>

      <div className={styles.resultsBar}>
        <p className={styles.count} aria-live="polite">
          {countText}
        </p>
        {set && <p className={styles.freshness}>From GitHub search, refreshed every 30 minutes</p>}
      </div>

      {set?.partial && (
        <Notice
          className={styles.notice}
          action={
            <Button size="sm" variant="ghost" onClick={retry}>
              Retry
            </Button>
          }
        >
          Some of the GitHub searches behind this list did not respond, so it may be incomplete.
        </Notice>
      )}

      {content}
    </div>
  );
}
