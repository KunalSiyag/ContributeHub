'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { startTransition, useEffect, useMemo, useOptimistic, useRef, useState } from 'react';
import type { Issue, Repository } from '@/types';
import { toGitHubLanguage } from '@/lib/matching';
import { useSkills } from '@/hooks/useSkills';
import { ButtonLink } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/primitives';
import { Tabs } from '@/components/ui/Tabs';
import {
  DEFAULT_STATE,
  HEADER,
  ISSUE_MAX_PAGE,
  REPO_MAX_PAGE,
  formatCount,
  formatTotal,
  issueRequestParams,
  parseDiscoverState,
  pluralize,
  repoRequestParams,
  tabItems,
  toSearchString,
  type DiscoverState,
} from './discover-state';
import type { SearchBinding } from './DiscoverParts';
import { useOrganizations, useSearchResults, type SearchResults } from './useDiscoverData';
import { useOrganizationsView } from './useOrganizationsView';
import IssuesPanel from './IssuesPanel';
import ProjectsPanel from './ProjectsPanel';
import OrganizationsPanel from './OrganizationsPanel';
import styles from './page.module.css';

const SEARCH_DEBOUNCE_MS = 400;
const ANNOUNCE_DELAY_MS = 500;

function resultCount(count: number, label = formatCount(count)) {
  return count === 0 ? 'No results' : `${label} ${pluralize(count, 'result', 'results')}`;
}

function searchAnnouncement<T>(results: SearchResults<T>): string {
  if (results.error) return results.error;
  if (results.loading) return 'Searching GitHub…';
  if (results.moreError) return results.moreError;
  if (results.loadingMore) return 'Loading more results…';
  const data = results.data;
  if (!data) return '';
  if (data.page > 1) return `Showing ${formatCount(data.items.length)} of ${formatTotal(data.total)} results`;
  return resultCount(data.items.length === 0 ? 0 : data.total, formatTotal(data.total));
}

/** True when a "/" press belongs to the focused element rather than the shortcut. */
function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true;
  return Boolean(target.closest('[role="menu"], dialog'));
}

export default function DiscoverClient({ aiAvailable = false }: { aiAvailable?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filter changes render at once; the URL catches up when the navigation lands.
  const [search, setOptimisticSearch] = useOptimistic(searchParams.toString());
  const state = useMemo(() => parseDiscoverState(new URLSearchParams(search)), [search]);

  // For the debounce timer, which fires after renders it didn't see.
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  const apply = (base: DiscoverState, patch: Partial<DiscoverState>) => {
    const next = toSearchString({ ...base, ...patch });
    if (next === toSearchString(base)) return;
    startTransition(() => {
      setOptimisticSearch(next);
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    });
  };

  /* ---------- Text search: a local draft, debounced into the URL ---------- */

  const [draft, setDraft] = useState(state.q);
  const [syncedQ, setSyncedQ] = useState(state.q);
  // Back/forward, tab links and "Clear filters" change `q` outside the input.
  if (state.q !== syncedQ) {
    setSyncedQ(state.q);
    if (state.q !== draft.trim()) setDraft(state.q);
  }

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelPendingSearch = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  const onSearchChange = (value: string) => {
    setDraft(value);
    cancelPendingSearch();
    const q = value.trim();
    if (q === state.q) return;
    // Clearing applies at once; typing waits for a pause.
    if (!q) {
      apply(state, { q });
      return;
    }
    timer.current = setTimeout(() => {
      timer.current = null;
      apply(latest.current, { q });
    }, SEARCH_DEBOUNCE_MS);
  };

  const searchForm = useRef<HTMLFormElement>(null);
  const searchBinding: SearchBinding = {
    formRef: searchForm,
    value: draft,
    onValueChange: onSearchChange,
    onSubmit: () => {
      cancelPendingSearch();
      apply(state, { q: draft.trim() });
    },
  };

  // Any filter change also commits whatever is typed in the search box.
  const setFilters = (patch: Partial<DiscoverState>) => {
    cancelPendingSearch();
    apply(state, { q: draft.trim(), ...patch });
  };

  const clearFilters = () => {
    cancelPendingSearch();
    setDraft('');
    apply(state, { ...DEFAULT_STATE, tab: state.tab });
  };

  /* ---------- "/" focuses the search box ---------- */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
      if (isTypingTarget(event.target)) return;
      const input = searchForm.current?.querySelector('input');
      if (!input) return;
      event.preventDefault();
      input.focus();
      input.select();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  /* ---------- Skills ---------- */

  const { skills, ready, hasSkills } = useSkills();
  const fitSkills = ready && hasSkills ? skills : null;
  const userLanguages = useMemo(() => {
    if (!fitSkills) return [];
    const names = fitSkills.languages.map(skill => toGitHubLanguage(skill)).filter((name): name is string => Boolean(name));
    return Array.from(new Set(names));
  }, [fitSkills]);

  /* ---------- Data ---------- */

  const issueParams = useMemo(() => issueRequestParams(state), [state]);
  const repoParams = useMemo(() => repoRequestParams(state), [state]);
  const issues = useSearchResults<Issue>('/api/issues', issueParams, {
    enabled: state.tab === 'issues',
    maxPage: ISSUE_MAX_PAGE,
  });
  const repos = useSearchResults<Repository>('/api/repositories', repoParams, {
    enabled: state.tab === 'projects',
    maxPage: REPO_MAX_PAGE,
  });
  const organizations = useOrganizations(state.tab === 'organizations');
  const orgView = useOrganizationsView(organizations.data?.organizations, state, draft);

  /* ---------- Screen reader announcements ---------- */

  let announcement = '';
  if (state.tab === 'issues') announcement = searchAnnouncement(issues);
  else if (state.tab === 'projects') announcement = searchAnnouncement(repos);
  else if (organizations.error) announcement = organizations.error;
  else if (organizations.loading) announcement = 'Loading organizations…';
  else if (organizations.data) announcement = resultCount(orgView.visible.length);

  const [announced, setAnnounced] = useState('');
  useEffect(() => {
    // Let typing and quick loads settle so screen readers hear one update.
    const id = setTimeout(() => setAnnounced(announcement), ANNOUNCE_DELAY_MS);
    return () => clearTimeout(id);
  }, [announcement]);

  return (
    <>
      <PageHeader
        eyebrow={HEADER.eyebrow}
        title={HEADER.title}
        description={HEADER.description}
        actions={
          ready && !hasSkills ? (
            <ButtonLink href="/preferences" variant="secondary">
              Add your skills
            </ButtonLink>
          ) : undefined
        }
      />

      {/* Tab links carry the typed text; a pending debounce must not undo the switch. */}
      <div onClickCapture={cancelPendingSearch}>
        <Tabs label="Discover sections" items={tabItems(draft.trim())} value={state.tab} className={styles.tabs} />
      </div>

      {state.tab === 'issues' && (
        <IssuesPanel
          state={state}
          search={searchBinding}
          setFilters={setFilters}
          clearFilters={clearFilters}
          results={issues}
          skills={fitSkills}
          userLanguages={userLanguages}
          aiAvailable={aiAvailable}
        />
      )}
      {state.tab === 'projects' && (
        <ProjectsPanel
          state={state}
          search={searchBinding}
          setFilters={setFilters}
          clearFilters={clearFilters}
          results={repos}
          skills={fitSkills}
        />
      )}
      {state.tab === 'organizations' && (
        <OrganizationsPanel
          state={state}
          search={searchBinding}
          setFilters={setFilters}
          clearFilters={clearFilters}
          organizations={organizations}
          view={orgView}
        />
      )}

      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announced}
      </p>
    </>
  );
}
