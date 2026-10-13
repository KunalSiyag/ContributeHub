'use client';

import { useMemo } from 'react';
import type { Repository } from '@/types';
import { scoreRepository, type SkillProfile } from '@/lib/matching';
import RepoRow, { RepoRowSkeleton } from '@/components/RepoRow';
import { Pill } from '@/components/ui/Tabs';
import { Toolbar } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { EmptyState, Notice, Panel } from '@/components/ui/primitives';
import rows from '@/components/rows.module.css';
import {
  REPO_SORTS,
  STAR_FILTERS,
  TOPICS,
  formatTotal,
  githubSearchUrl,
  hasActiveFilters,
  languageOptions,
  pluralize,
  type DiscoverState,
} from './discover-state';
import { ChipGroup, LoadMore, ResultsHeader, SearchField, SelectField, useAppendFocus, type SearchBinding } from './DiscoverParts';
import type { SearchResults } from './useDiscoverData';
import styles from './page.module.css';

interface ProjectsPanelProps {
  state: DiscoverState;
  search: SearchBinding;
  setFilters: (patch: Partial<DiscoverState>) => void;
  clearFilters: () => void;
  results: SearchResults<Repository>;
  skills: SkillProfile | null;
}

export default function ProjectsPanel({ state, search, setFilters, clearFilters, results, skills }: ProjectsPanelProps) {
  const shown = results.data ?? results.stale;
  const items = useMemo(() => shown?.items ?? [], [shown]);
  const { listRef, markAppend } = useAppendFocus(items.length, results.data?.key ?? null);

  const fits = useMemo(() => {
    if (!skills) return null;
    return new Map(items.map(repo => [repo.id, scoreRepository(repo, skills)]));
  }, [items, skills]);

  // A topic from a shared link stays visible (and removable) even if it isn't curated.
  const topics: readonly string[] = state.topic && !(TOPICS as readonly string[]).includes(state.topic) ? [state.topic, ...TOPICS] : TOPICS;

  const total = results.data?.total ?? 0;
  const count = results.data ? `${formatTotal(total)} ${pluralize(total, 'repository', 'repositories')}` : null;
  const query = shown?.query || null;

  return (
    <>
      <div className={styles.filters}>
        <Toolbar>
          <SearchField label="Search repositories" placeholder="Search repositories…" {...search} />
          <SelectField
            id="discover-repo-language"
            label="Language"
            value={state.language}
            options={languageOptions(state.language)}
            onChange={language => setFilters({ language })}
          />
          <SelectField
            id="discover-repo-stars"
            label="Minimum stars"
            value={state.stars}
            options={STAR_FILTERS}
            onChange={stars => setFilters({ stars })}
          />
          <SelectField
            id="discover-repo-sort"
            label="Sort repositories"
            value={state.repoSort}
            options={REPO_SORTS}
            onChange={repoSort => setFilters({ repoSort })}
          />
        </Toolbar>

        <div className={styles.chipRows}>
          <ChipGroup label="Topic" showLabel id="discover-topics">
            {topics.map(topic => {
              const pressed = state.topic === topic;
              return (
                <Pill key={topic} pressed={pressed} onClick={() => setFilters({ topic: pressed ? '' : topic })}>
                  {topic}
                </Pill>
              );
            })}
          </ChipGroup>
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
              githubUrl={results.data?.query ? githubSearchUrl(results.data.query, 'repositories', state.repoSort) : null}
            />

            {items.length === 0 ? (
              results.loading ? (
                <RepoRowSkeleton count={6} />
              ) : (
                <Panel>
                  <EmptyState
                    title="No repositories match these filters"
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
                  />
                </Panel>
              )
            ) : (
              <div className={styles.listFrame} data-stale={results.loading || undefined}>
                <ul ref={listRef} className={rows.list} aria-label="Repositories">
                  {items.map(repo => (
                    <RepoRow key={repo.id} repo={repo} match={fits ? fits.get(repo.id) : undefined} />
                  ))}
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
