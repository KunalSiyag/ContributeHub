'use client';

import Link from 'next/link';
import OrgRow from '@/components/OrgRow';
import { RepoRowSkeleton } from '@/components/RepoRow';
import { Pill } from '@/components/ui/Tabs';
import { Toolbar } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { EmptyState, Notice, Panel } from '@/components/ui/primitives';
import { IconArrowRight } from '@/components/icons';
import rows from '@/components/rows.module.css';
import {
  ORG_SORTS,
  PROGRAMS,
  formatCount,
  hasActiveFilters,
  languageOptions,
  organizationsLabel,
  type DiscoverState,
} from './discover-state';
import { ChipGroup, ResultsHeader, SearchField, SelectField, type SearchBinding } from './DiscoverParts';
import type { OrganizationsData } from './useDiscoverData';
import type { OrganizationsView } from './useOrganizationsView';
import styles from './page.module.css';

interface OrganizationsPanelProps {
  state: DiscoverState;
  search: SearchBinding;
  setFilters: (patch: Partial<DiscoverState>) => void;
  clearFilters: () => void;
  organizations: {
    data: OrganizationsData | null;
    loading: boolean;
    error: string | null;
    retry: () => void;
  };
  view: OrganizationsView;
}

export default function OrganizationsPanel({ state, search, setFilters, clearFilters, organizations, view }: OrganizationsPanelProps) {
  const { data, loading, error, retry } = organizations;
  const { visible, programCounts, languages, years } = view;

  const meta = data?.meta;
  // Only organizations with a GitHub repository can have live stats; rate
  // limits surface as repositories without them.
  const missing = meta ? Math.max(0, meta.repoCount - meta.liveCount) : 0;
  let liveNote: string | null = null;
  if (meta && meta.repoCount > 0) {
    liveNote =
      missing === 0
        ? `Live GitHub stats for ${meta.repoCount === 1 ? 'the 1 repository' : `all ${formatCount(meta.repoCount)} repositories`}`
        : `Live GitHub stats for ${formatCount(meta.liveCount)} of ${formatCount(meta.repoCount)} repositories`;
  }

  return (
    <>
      <div className={styles.filters}>
        <Toolbar>
          <SearchField label="Search organizations" placeholder="Search organizations…" {...search} />
          <SelectField
            id="discover-org-language"
            label="Language"
            value={state.language}
            options={languageOptions(state.language, languages)}
            onChange={language => setFilters({ language })}
          />
          {years.length > 0 && (
            <SelectField
              id="discover-org-year"
              label="Year they took part"
              value={state.year}
              options={[{ value: '', label: 'Any year' }, ...years.map(year => ({ value: year, label: `Took part in ${year}` }))]}
              onChange={year => setFilters({ year })}
            />
          )}
          <SelectField
            id="discover-org-sort"
            label="Sort organizations"
            value={state.orgSort}
            options={ORG_SORTS}
            onChange={orgSort => setFilters({ orgSort })}
          />
        </Toolbar>

        <div className={styles.chipRows}>
          <ChipGroup label="Program">
            {PROGRAMS.map(program => (
              <Pill
                key={program.value}
                pressed={state.program === program.value}
                onClick={() => setFilters({ program: program.value })}
                count={data ? programCounts.get(program.value) : undefined}
              >
                {program.label}
              </Pill>
            ))}
          </ChipGroup>
        </div>
      </div>

      <section className={styles.results} aria-labelledby="discover-results-heading" aria-busy={loading || undefined}>
        {error ? (
          <Notice
            tone="warning"
            action={
              <Button size="sm" variant="secondary" onClick={retry}>
                Retry
              </Button>
            }
          >
            {error}
          </Notice>
        ) : (
          <>
            <ResultsHeader
              headingId="discover-results-heading"
              count={data ? organizationsLabel(visible.length) : null}
              loading={loading}
              pendingLabel="Loading organizations…"
              note={liveNote}
            />

            {missing > 0 && (
              <Notice tone="warning" className={styles.listNotice}>
                Live GitHub data is unavailable for {organizationsLabel(missing)}; showing saved figures.
              </Notice>
            )}

            {!data ? (
              <RepoRowSkeleton count={6} />
            ) : visible.length === 0 ? (
              <Panel>
                <EmptyState
                  title="No organizations match these filters"
                  action={
                    hasActiveFilters({ ...state, q: search.value.trim() }) ? (
                      <Button variant="secondary" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    ) : undefined
                  }
                />
              </Panel>
            ) : (
              <ul className={rows.list} aria-label="Organizations">
                {visible.map(org => (
                  <OrgRow key={`${org.slug}|${org.official?.url ?? ''}`} org={org} />
                ))}
              </ul>
            )}

            {data && (
              <p className={styles.footnote}>
                GSoC organizations come from Google&rsquo;s official roster; the others from past program rosters. Check each
                program&rsquo;s current list before applying.{' '}
                <Link href="/events" className={styles.footnoteLink}>
                  View programs
                  <IconArrowRight size={12} />
                </Link>
              </p>
            )}
          </>
        )}
      </section>
    </>
  );
}
