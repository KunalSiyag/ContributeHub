'use client';

import { useState } from 'react';
import type { Issue } from '@/types';
import { useAsync } from '@/hooks/useAsync';
import { fetchJson } from '@/lib/fetch-json';
import { dailyPick, watchlistSearch, WATCHLIST_MAX_REPOS } from '@/lib/watchlist';
import IssueRow, { IssueRowSkeleton } from '@/components/IssueRow';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Menu } from '@/components/ui/Menu';
import { Segmented } from '@/components/ui/Tabs';
import { EmptyState, Notice } from '@/components/ui/primitives';
import { IconChevronDown, IconRss } from '@/components/icons';
import rows from '@/components/rows.module.css';
import styles from './tracker.module.css';

const VIEWS = [
  { value: 'all', label: 'All new issues' },
  { value: 'good-first', label: 'Good first issues' },
] as const;
type View = (typeof VIEWS)[number]['value'];

/** Newest open issues across the saved repositories, with an RSS feed of the same list. */
export default function Watchlist({ repos }: { repos: string[] }) {
  const [view, setView] = useState<View>('all');
  const { toast } = useToast();
  const watched = repos.slice(0, WATCHLIST_MAX_REPOS);
  const search = watchlistSearch({
    repos: watched,
    labels: view === 'good-first' ? ['good first issue'] : [],
    unassigned: true,
  });
  const { data, error, loading, reload } = useAsync(watched.length ? search : null, signal =>
    fetchJson<{ items: Issue[] }>(`/api/issues/watchlist?${search}`, { signal })
  );

  const copyFeed = async (daily: boolean) => {
    const url = `${window.location.origin}/feed/issues.xml?${search}${daily ? '&daily=1' : ''}`;
    try {
      await navigator.clipboard.writeText(url);
      toast(
        daily
          ? 'Daily feed copied: one issue a day from these repositories, in any RSS reader.'
          : 'Feed link copied. Add it to any RSS reader, or a Slack or Discord RSS app.',
        { tone: 'success' }
      );
    } catch {
      window.open(url, '_blank', 'noopener');
    }
  };
  // Same issue all day, a different one tomorrow (the daily feed carries it too).
  const pick = data ? dailyPick(data.items, new Date().toISOString().slice(0, 10)) : undefined;

  return (
    <section className={styles.watchlist} aria-labelledby="watchlist-heading">
      <div className={styles.watchlistHead}>
        <div>
          <h2 id="watchlist-heading" className={styles.watchlistTitle}>
            New in your saved repositories
          </h2>
          <p className={styles.watchlistNote}>
            Open, unassigned issues, newest first{repos.length > WATCHLIST_MAX_REPOS ? ` (first ${WATCHLIST_MAX_REPOS} repositories)` : ''}.
          </p>
        </div>
        <div className={styles.watchlistTools}>
          <Segmented label="Issues to show" options={[...VIEWS]} value={view} onChange={setView} />
          <Menu
            align="end"
            label="Follow these issues"
            items={[
              { label: 'Every new issue', icon: <IconRss size={14} />, onSelect: () => void copyFeed(false) },
              { label: 'One issue a day', icon: <IconRss size={14} />, onSelect: () => void copyFeed(true) },
            ]}
            trigger={props => (
              <Button variant="secondary" size="sm" {...props}>
                <IconRss size={13} />
                RSS
                <IconChevronDown size={12} />
              </Button>
            )}
          />
        </div>
      </div>
      {error ? (
        <Notice
          tone="warning"
          action={
            <Button size="sm" variant="secondary" onClick={reload}>
              Retry
            </Button>
          }
        >
          {error.message}
        </Notice>
      ) : loading || !data ? (
        <IssueRowSkeleton count={3} label="Loading new issues" />
      ) : data.items.length === 0 ? (
        <EmptyState title={view === 'good-first' ? 'No open good first issues right now' : 'No open, unassigned issues right now'} />
      ) : (
        <>
          {pick && (
            <div className={styles.pick}>
              <span className="eyebrow">Today&rsquo;s pick</span>
              <ul className={rows.list}>
                <IssueRow issue={pick} />
              </ul>
            </div>
          )}
          <ul className={rows.list}>
            {data.items
              .filter(issue => issue.id !== pick?.id)
              .slice(0, 10)
              .map(issue => (
                <IssueRow key={issue.id} issue={issue} compact />
              ))}
          </ul>
        </>
      )}
    </section>
  );
}
