'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { alertSearchParams, readAlertInput } from '@/lib/alerts';
import type { Issue } from '@/types';
import { scoreIssue, type SkillProfile } from '@/lib/matching';
import IssueRow, { IssueRowSkeleton } from '@/components/IssueRow';
import { Pill } from '@/components/ui/Tabs';
import { Toolbar } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { EmptyState, Notice, Panel } from '@/components/ui/primitives';
import { IconBell, IconRss } from '@/components/icons';
import rows from '@/components/rows.module.css';
import {
  ISSUE_PRESETS,
  ISSUE_SORTS,
  formatTotal,
  githubSearchUrl,
  hasActiveFilters,
  languageOptions,
  pluralize,
  type DiscoverState,
} from './discover-state';
import DescribeSearch from './DescribeSearch';
import { ChipGroup, LoadMore, ResultsHeader, SearchField, SelectField, useAppendFocus, type SearchBinding } from './DiscoverParts';
import type { SearchResults } from './useDiscoverData';
import styles from './page.module.css';

interface IssuesPanelProps {
  state: DiscoverState;
  search: SearchBinding;
  setFilters: (patch: Partial<DiscoverState>) => void;
  clearFilters: () => void;
  results: SearchResults<Issue>;
  /** Skills used for the fit score; null when the user has none on file. */
  skills: SkillProfile | null;
  /** The user's languages as GitHub names, for quick filters. */
  userLanguages: string[];
  /** Shows "Describe what you want" (needs the AI key). */
  aiAvailable?: boolean;
}

export default function IssuesPanel({ state, search, setFilters, clearFilters, results, skills, userLanguages, aiAvailable = false }: IssuesPanelProps) {
  const shown = results.data ?? results.stale;
  const items = useMemo(() => shown?.items ?? [], [shown]);
  const { listRef, markAppend } = useAppendFocus(items.length, results.data?.key ?? null);

  const fits = useMemo(() => {
    if (!skills) return null;
    return new Map(items.map(issue => [issue.id, scoreIssue(issue, skills, state.language || null)]));
  }, [items, skills, state.language]);

  const total = results.data?.total ?? 0;
  const count = results.data ? `${formatTotal(total)} open ${pluralize(total, 'issue', 'issues')}` : null;
  const query = shown?.query || null;

  return (
    <>
      <div className={styles.filters}>
        <Toolbar>
          <SearchField label="Search issues" placeholder="Search issues…" {...search} />
          <SelectField
            id="discover-issue-language"
            label="Language"
            value={state.language}
            options={languageOptions(state.language)}
            onChange={language => setFilters({ language })}
          />
          <SelectField
            id="discover-issue-sort"
            label="Sort issues"
            value={state.issueSort}
            options={ISSUE_SORTS}
            onChange={issueSort => setFilters({ issueSort })}
          />
        </Toolbar>

        {aiAvailable && <DescribeSearch onApply={result => setFilters({ preset: result.preset, language: result.language, q: result.q })} />}

        <div className={styles.chipRows}>
          <ChipGroup label="Issue type">
            {ISSUE_PRESETS.map(preset => (
              <Pill key={preset.value} pressed={state.preset === preset.value} onClick={() => setFilters({ preset: preset.value })}>
                {preset.label}
              </Pill>
            ))}
          </ChipGroup>

          {userLanguages.length > 0 && (
            <ChipGroup label="Your languages" showLabel id="discover-your-languages">
              {userLanguages.map(language => {
                const pressed = state.language === language;
                return (
                  <Pill key={language} pressed={pressed} onClick={() => setFilters({ language: pressed ? '' : language })}>
                    {language}
                  </Pill>
                );
              })}
            </ChipGroup>
          )}
        </div>
      </div>

      <section className={styles.results} aria-labelledby="discover-results-heading" aria-busy={results.loading || undefined}>
        {results.error ? (
          <Notice
            tone="warning"
            action={
              <Button size="sm" variant="secondary" onClick={results.retry}>
                Retry
              </Button>
            }
          >
            {results.error}
          </Notice>
        ) : (
          <>
            <ResultsHeader
              headingId="discover-results-heading"
              count={count}
              loading={results.loading}
              query={query}
              githubUrl={results.data?.query ? githubSearchUrl(results.data.query, 'issues', state.issueSort) : null}
              actions={<FollowSearch preset={state.preset} language={state.language} q={state.q} />}
            />

            {items.length === 0 ? (
              results.loading ? (
                <IssueRowSkeleton count={6} />
              ) : (
                <Panel>
                  <EmptyState
                    title="No open issues match these filters"
                    action={
                      hasActiveFilters(state) ? (
                        <Button variant="secondary" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      ) : (
                        <Button variant="secondary" onClick={results.retry}>
                          Search again
                        </Button>
                      )
                    }
                  >
                    {state.preset === 'good-first' ? 'Try “Help wanted” or “All open” to widen the search.' : undefined}
                  </EmptyState>
                </Panel>
              )
            ) : (
              <div className={styles.listFrame} data-stale={results.loading || undefined}>
                <ul ref={listRef} className={rows.list} aria-label="Open issues">
                  {items.map(issue => {
                    const fit = fits?.get(issue.id);
                    return (
                      <IssueRow
                        key={issue.id}
                        issue={issue}
                        match={fit ? fit.score : undefined}
                        matchReasons={fit ? fit.reasons : undefined}
                      />
                    );
                  })}
                </ul>
              </div>
            )}

            {results.data && results.data.items.length > 0 && (
              <LoadMore
                shown={results.data.items.length}
                totalLabel={formatTotal(total)}
                hasMore={results.hasMore}
                capped={results.capped}
                loading={results.loadingMore}
                error={results.moreError}
                onLoadMore={() => {
                  markAppend();
                  results.loadMore();
                }}
              />
            )}
          </>
        )}
      </section>
    </>
  );
}

/** Keep this search: as an alert (signed in) or as an RSS feed (anyone). */
function FollowSearch({ preset, language, q }: { preset: string; language: string; q: string }) {
  const alert = readAlertInput({ name: '', preset, language, labels: [], repos: [], keywords: q, minStars: 0 }).value;
  if (!alert) return null;
  const params = new URLSearchParams({ new: '1', preset });
  if (language) params.set('language', language);
  if (q) params.set('q', q);
  return (
    <>
      <Link className={styles.queryLink} href={`/alerts?${params}`}>
        <IconBell size={13} />
        Create alert
      </Link>
      <a className={styles.queryLink} href={`/feed/alerts.xml?${alertSearchParams(alert)}`}>
        <IconRss size={13} />
        RSS
      </a>
    </>
  );
}
