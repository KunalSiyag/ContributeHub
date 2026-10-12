'use client';

import { useEffect, useRef, type ReactNode, type Ref } from 'react';
import { SearchInput, Select } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Kbd, Notice, Skeleton } from '@/components/ui/primitives';
import { IconArrowUpRight } from '@/components/icons';
import rows from '@/components/rows.module.css';
import { SEARCH_INPUT_ID, formatCount } from './discover-state';
import styles from './page.module.css';

/* ---------- Search ---------- */

/** The search box state each panel renders into its toolbar. */
export interface SearchBinding {
  value: string;
  onValueChange: (value: string) => void;
  /** Enter commits the search right away instead of waiting for the debounce. */
  onSubmit: () => void;
  /** Lets the page focus the box from its "/" shortcut. */
  formRef?: Ref<HTMLFormElement>;
}

interface SearchFieldProps extends SearchBinding {
  label: string;
  placeholder: string;
}

export function SearchField({ label, placeholder, value, onValueChange, onSubmit, formRef }: SearchFieldProps) {
  return (
    <form
      ref={formRef}
      role="search"
      className={styles.searchField}
      onSubmit={event => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor={SEARCH_INPUT_ID} className="visually-hidden">
        {label}
      </label>
      <SearchInput
        id={SEARCH_INPUT_ID}
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
        wrapperClassName={styles.searchControl}
        aria-keyshortcuts="/"
        enterKeyHint="search"
      />
      {!value && (
        <span className={styles.searchHint} aria-hidden="true">
          <Kbd>/</Kbd>
        </span>
      )}
    </form>
  );
}

/* ---------- Select with a hidden label ---------- */

interface SelectFieldProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

export function SelectField<T extends string>({ id, label, value, options, onChange }: SelectFieldProps<T>) {
  return (
    <>
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <Select
        id={id}
        value={value}
        options={[...options]}
        onChange={event => onChange(event.target.value as T)}
        wrapperClassName={styles.select}
      />
    </>
  );
}

/* ---------- Chip groups ---------- */

interface ChipGroupProps {
  label: string;
  /** Visible eyebrow before the chips; otherwise the label is for assistive tech only. */
  showLabel?: boolean;
  id?: string;
  children: ReactNode;
}

export function ChipGroup({ label, showLabel, id, children }: ChipGroupProps) {
  if (showLabel && id) {
    return (
      <div className={styles.chips} role="group" aria-labelledby={id}>
        <span id={id} className={`eyebrow ${styles.chipsLabel}`}>
          {label}
        </span>
        {children}
      </div>
    );
  }
  return (
    <div className={styles.chips} role="group" aria-label={label}>
      {children}
    </div>
  );
}

/* ---------- Results header ---------- */

interface ResultsHeaderProps {
  /** e.g. "1,284 open issues"; null while the first page loads. */
  count: string | null;
  loading: boolean;
  pendingLabel?: string;
  /** The live GitHub query string behind the results. */
  query?: string | null;
  /** A muted line used instead of a query (organizations). */
  note?: ReactNode;
  githubUrl?: string | null;
  /** Small links beside "View query on GitHub", e.g. following the search. */
  actions?: ReactNode;
  headingId: string;
}

export function ResultsHeader({
  count,
  loading,
  pendingLabel = 'Searching GitHub…',
  query,
  note,
  githubUrl,
  actions,
  headingId,
}: ResultsHeaderProps) {
  return (
    <div className={styles.resultsHead}>
      <h2 id={headingId} className={styles.count}>
        {loading || count === null ? <span className={styles.countPending}>{pendingLabel}</span> : count}
      </h2>
      {(githubUrl || actions) && (
        <div className={styles.queryLinks}>
          {actions}
          {githubUrl && (
            <a className={styles.queryLink} href={githubUrl} target="_blank" rel="noopener noreferrer">
              View query on GitHub
              <IconArrowUpRight size={13} />
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      )}
      <p className={[styles.queryLine, loading && styles.queryLineStale].filter(Boolean).join(' ')}>
        {query ? (
          <>
            <span className={styles.prompt} aria-hidden="true">
              ›
            </span>
            <span className="visually-hidden">GitHub query: </span>
            <code className={styles.queryText}>{query}</code>
          </>
        ) : note ? (
          note
        ) : loading ? (
          <Skeleton width="min(420px, 72%)" height={10} className={styles.querySkeleton} />
        ) : null}
      </p>
    </div>
  );
}

/* ---------- Focus after "Load more" ---------- */

function focusWasLost() {
  const active = document.activeElement;
  return !active || active === document.body;
}

/**
 * After a page is appended, move focus to the first new row's title so
 * keyboard users continue where the new results start.
 */
export function useAppendFocus(count: number, resultKey: string | null) {
  const listRef = useRef<HTMLUListElement>(null);
  const pending = useRef<{ key: string; from: number } | null>(null);

  useEffect(() => {
    const target = pending.current;
    if (!target) return;
    if (target.key !== resultKey) {
      pending.current = null;
      return;
    }
    if (count <= target.from) return;
    pending.current = null;
    // The loading button disables itself and drops focus; don't pull focus from anything chosen since.
    if (!focusWasLost()) return;
    const row = listRef.current?.children.item(target.from);
    row?.querySelector<HTMLElement>(`.${CSS.escape(rows.title)}`)?.focus({ preventScroll: true });
  }, [count, resultKey]);

  const markAppend = () => {
    if (resultKey) pending.current = { key: resultKey, from: count };
  };

  return { listRef, markAppend };
}

/* ---------- Load more ---------- */

interface LoadMoreProps {
  shown: number;
  totalLabel: string;
  hasMore: boolean;
  capped: boolean;
  loading: boolean;
  error: string | null;
  onLoadMore: () => void;
}

export function LoadMore({ shown, totalLabel, hasMore, capped, loading, error, onLoadMore }: LoadMoreProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);

  // The button is disabled while loading, which blurs it. If the request fails,
  // hand focus back so keyboard users land on "Retry".
  useEffect(() => {
    if (!error || !refocus.current) return;
    refocus.current = false;
    if (focusWasLost()) buttonRef.current?.focus();
  }, [error]);

  if (hasMore || error) {
    return (
      <div className={styles.more}>
        {error && (
          <Notice tone="warning" className={styles.moreNotice}>
            {error}
          </Notice>
        )}
        <Button
          ref={buttonRef}
          variant="secondary"
          loading={loading}
          onClick={() => {
            refocus.current = document.activeElement === buttonRef.current;
            onLoadMore();
          }}
        >
          {error ? 'Retry' : 'Load more'}
        </Button>
        <p className={styles.moreCaption}>
          Showing {formatCount(shown)} of {totalLabel}
        </p>
      </div>
    );
  }

  if (capped) {
    return (
      <div className={styles.more}>
        <p className={styles.moreCaption}>
          Showing {formatCount(shown)} of {totalLabel}. Narrow the filters to reach the rest.
        </p>
      </div>
    );
  }

  return null;
}
