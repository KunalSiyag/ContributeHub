import type { Issue } from '@/types';
import { GitHubError, keepLastGoodPage, searchIssues } from '@/lib/github';
import IssueRow from '@/components/IssueRow';
import { Notice } from '@/components/ui/primitives';
import rows from '@/components/rows.module.css';
import styles from './page.module.css';

/** The search behind the list, also used for the "see all" link. */
export function programIssueQuery(label: string, since?: string) {
  return `label:${label} is:issue is:open no:assignee archived:false${since ? ` created:>=${since}` : ''}`;
}

type Result = { items: Issue[]; total: number } | { error: string };

async function load(label: string, since?: string): Promise<Result> {
  try {
    const { items, total_count } = await searchIssues(programIssueQuery(label, since), {
      sort: 'created',
      perPage: 8,
      revalidate: 900,
    });
    return { items, total: total_count };
  } catch (error) {
    await keepLastGoodPage(error);
    return {
      error:
        error instanceof GitHubError && error.rateLimited
          ? 'GitHub is rate limiting searches right now. Try again in a minute.'
          : 'GitHub could not be reached.',
    };
  }
}

/** Open, unassigned issues carrying the program's label, newest first. */
export default async function ProgramIssues({ label, since }: { label: string; since?: string }) {
  const result = await load(label, since);
  if ('error' in result) return <Notice tone="warning">{result.error}</Notice>;
  if (result.items.length === 0) {
    return <p className={styles.sectionCaption}>No open, unassigned issues carry the {label} label right now.</p>;
  }
  return (
    <>
      <p className={styles.sectionCaption}>
        {result.total.toLocaleString('en-US')} open, unassigned issues labelled <code>{label}</code>
        {since ? ' this season' : ''}. Newest first, live from GitHub.
      </p>
      <ul className={rows.list}>
        {result.items.map(issue => (
          <IssueRow key={issue.id} issue={issue} compact />
        ))}
      </ul>
    </>
  );
}
