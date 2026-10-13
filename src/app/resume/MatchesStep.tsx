'use client';

import { Fragment, useId, type ReactNode, type RefObject } from 'react';
import IssueRow, { IssueRowSkeleton } from '@/components/IssueRow';
import { Button } from '@/components/ui/Button';
import { EmptyState, Notice, Panel } from '@/components/ui/primitives';
import { IconPencil, IconRefreshCw, IconSearch } from '@/components/icons';
import type { ExperienceLevel, SkillProfile } from '@/lib/matching';
import { searchableLanguages, type MatchState } from './flow';
import rows from '@/components/rows.module.css';
import styles from './page.module.css';

/** What /api/issues/recommended searches for at each level. */
const SEARCH_SCOPE: Record<ExperienceLevel, ReactNode> = {
  beginner: (
    <>
      Unassigned issues labelled <span className={styles.term}>good first issue</span>
    </>
  ),
  intermediate: (
    <>
      Unassigned issues labelled <span className={styles.term}>help wanted</span>
    </>
  ),
  advanced: 'Unassigned open issues',
};

function Terms({ values, conjunction }: { values: string[]; conjunction: 'and' | 'or' }) {
  return values.map((value, index) => (
    <Fragment key={value}>
      {index > 0 && (index === values.length - 1 ? ` ${conjunction} ` : ', ')}
      <span className={styles.term}>{value}</span>
    </Fragment>
  ));
}

/** Plain-language version of the GitHub searches behind the results. */
function SearchSummary({ query, languages }: { query: SkillProfile; languages: string[] }) {
  const tools = query.technologies.slice(0, 2);
  return (
    <>
      {SEARCH_SCOPE[query.experienceLevel]}
      {languages.length > 0 && (
        <>
          {' in '}
          <Terms values={languages} conjunction="and" />
        </>
      )}
      {tools.length > 0 && (
        <>
          {languages.length > 0 ? ', plus ones mentioning ' : ' mentioning '}
          <Terms values={tools} conjunction="or" />
        </>
      )}
      .
    </>
  );
}

interface MatchesStepProps {
  state: Exclude<MatchState, { status: 'idle' }>;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onEdit: () => void;
  onRetry: () => void;
}

export default function MatchesStep({ state, headingRef, onEdit, onRetry }: MatchesStepProps) {
  const titleId = useId();
  const languages = state.status === 'done' ? state.languages : searchableLanguages(state.query);
  const count = state.status === 'done' ? state.items.length : 0;

  return (
    <section className={styles.step} aria-labelledby={titleId} aria-busy={state.status === 'loading' || undefined}>
      <header className={styles.stepHead}>
        <div className={styles.stepHeadRow}>
          <h2 id={titleId} ref={headingRef} tabIndex={-1} className={styles.stepTitle}>
            {state.status === 'done' ? (
              <>
                <span className={styles.count}>{count}</span>{' '}
                {count === 0 ? 'issues found' : `${count === 1 ? 'issue' : 'issues'}, ranked by fit`}
              </>
            ) : state.status === 'loading' ? (
              'Searching GitHub…'
            ) : (
              'Couldn’t load matches'
            )}
          </h2>
          <Button variant="ghost" onClick={onEdit} className={styles.edgeEnd}>
            <IconPencil size={14} />
            Edit skills
          </Button>
        </div>
        <p className={styles.stepCaption}>
          <SearchSummary query={state.query} languages={languages} />
          {state.status === 'done' && state.total > count && (
            <>
              {' '}
              Showing the top <span className={styles.figure}>{count}</span> of{' '}
              <span className={styles.figure}>{state.total}</span>.
            </>
          )}
        </p>
      </header>

      {state.status === 'loading' && <IssueRowSkeleton count={6} />}

      {state.status === 'error' && (
        <Notice
          tone="danger"
          action={
            <Button variant="secondary" size="sm" onClick={onRetry}>
              <IconRefreshCw size={13} />
              Retry
            </Button>
          }
        >
          {state.message}
        </Notice>
      )}

      {state.status === 'done' && state.partial && (
        <Notice tone="warning">Some searches failed, so results may be incomplete.</Notice>
      )}

      {state.status === 'done' && count > 0 && (
        <>
          <ul className={rows.list}>
            {state.items.map(item => (
              <IssueRow key={item.id} issue={item} match={item.matchScore} matchReasons={item.matchReasons} />
            ))}
          </ul>
          <p className={styles.footnote}>
            Fit adds up the repository language, labels that suit your experience level, and tools or areas named in
            the issue title or labels.
          </p>
        </>
      )}

      {state.status === 'done' && count === 0 && (
        <Panel>
          <EmptyState
            icon={<IconSearch size={16} />}
            title="No open issues matched these skills"
            action={
              <Button variant="secondary" onClick={onEdit}>
                Add more languages
              </Button>
            }
          >
            Add more languages or frameworks, then search again. Up to three languages are searched at a time.
          </EmptyState>
        </Panel>
      )}
    </section>
  );
}
