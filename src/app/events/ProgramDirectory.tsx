'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { SearchInput } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Tabs';
import { Button, ButtonAnchor } from '@/components/ui/Button';
import { EmptyState, Tag } from '@/components/ui/primitives';
import { IconArrowUpRight, IconSearch } from '@/components/icons';
import rows from '@/components/rows.module.css';
import styles from './page.module.css';

/** A directory listing as the page hands it over (dates already resolved on the server). */
export interface DirectoryEntry {
  name: string;
  url: string;
  organization: string;
  timeline: string;
  reward: string;
  eligibility: string;
  kind: 'fellowship' | 'challenge';
  paid: boolean | null;
  /** Orion's page with live countdowns, for programs Orion tracks. */
  trackedHref: string | null;
  next: { date: string; label: string; display: string } | null;
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'paid', label: 'Paid' },
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'challenge', label: 'Contribution events' },
] as const;
type Filter = (typeof FILTERS)[number]['id'];

const matches: Record<Filter, (entry: DirectoryEntry) => boolean> = {
  all: () => true,
  paid: entry => entry.paid === true,
  unpaid: entry => entry.paid === false,
  challenge: entry => entry.kind === 'challenge',
};

export default function ProgramDirectory({ entries }: { entries: DirectoryEntry[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const trimmed = query.trim().toLowerCase();

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map(f => [f.id, entries.filter(matches[f.id]).length])) as Record<Filter, number>,
    [entries]
  );
  const visible = entries.filter(
    entry =>
      matches[filter](entry) &&
      (!trimmed ||
        [entry.name, entry.organization, entry.eligibility, entry.timeline].some(text => text.toLowerCase().includes(trimmed)))
  );

  return (
    <div className={styles.directory}>
      <div className={styles.directoryTools}>
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search programs, organizers, eligibility…"
          aria-label="Search the program directory"
          wrapperClassName={styles.directorySearch}
        />
        <div className={styles.directoryFilters} role="group" aria-label="Filter programs">
          {FILTERS.map(f => (
            <Pill key={f.id} pressed={filter === f.id} onClick={() => setFilter(f.id)} count={counts[f.id]}>
              {f.label}
            </Pill>
          ))}
        </div>
      </div>

      {visible.length > 0 ? (
        <ul className={rows.list} aria-label="Programs">
          {visible.map(entry => (
            <li key={entry.name} className={rows.row} data-spotlight="wash">
              <div className={rows.main}>
                <div className={rows.context}>
                  <span>{entry.organization || 'Independent'}</span>
                  <span className={rows.sep}>·</span>
                  <span>{entry.kind === 'challenge' ? 'Contribution event' : 'Fellowship or mentorship'}</span>
                </div>
                <a href={entry.url} target="_blank" rel="noopener noreferrer" className={rows.title}>
                  {entry.name}
                </a>
                {entry.timeline && <p className={rows.description}>{entry.timeline}</p>}
                <div className={rows.meta}>
                  {entry.reward && <span className={rows.metaItem}>{entry.reward}</span>}
                  {entry.eligibility && <span className={rows.metaItem}>{entry.eligibility}</span>}
                </div>
                <div className={rows.tags}>
                  {entry.paid === true && <Tag>Paid</Tag>}
                  {entry.paid === false && <Tag tone="muted">Unpaid</Tag>}
                  {entry.next && (
                    <Tag tone="default" title={entry.next.label}>
                      Next: {entry.next.display}
                    </Tag>
                  )}
                </div>
              </div>
              <div className={rows.aside}>
                {entry.trackedHref ? (
                  <Link href={entry.trackedHref} className={styles.directoryTracked}>
                    Countdown in Orion
                  </Link>
                ) : null}
                <ButtonAnchor href={entry.url} variant="secondary" size="sm">
                  Official site
                  <IconArrowUpRight size={13} />
                </ButtonAnchor>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<IconSearch size={16} />}
          title="No programs match these filters"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}
    </div>
  );
}
