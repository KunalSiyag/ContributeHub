import Link from 'next/link';
import type { Issue } from '@/types';
import { Avatar, Skeleton, Tag } from './ui/primitives';
import RelativeTime from './RelativeTime';
import TrackControl from './TrackControl';
import { IconMessageSquare } from './icons';
import styles from './rows.module.css';

function repoParts(issue: Issue) {
  const match = issue.repository_url.match(/repos\/([^/]+)\/([^/]+)$/);
  const owner = match?.[1] ?? '';
  const repo = match?.[2] ?? '';
  return { owner, repo, fullName: `${owner}/${repo}` };
}

interface IssueRowProps {
  issue: Issue;
  /** 0–100 skill match, shown when the user has skills on file. */
  match?: number | null;
  matchReasons?: string[];
  bounty?: { amount: string; source?: string } | null;
  compact?: boolean;
}

export default function IssueRow({ issue, match, matchReasons, bounty, compact }: IssueRowProps) {
  const { owner, repo, fullName } = repoParts(issue);
  const labels = (issue.labels ?? []).slice(0, 4);

  return (
    <li className={[styles.row, compact && styles.compact].filter(Boolean).join(' ')} data-spotlight="wash">
      <div className={styles.main}>
        <div className={styles.context}>
          <a className={styles.repo} href={`https://github.com/${fullName}`} target="_blank" rel="noopener noreferrer">
            <Avatar src={`https://github.com/${owner}.png?size=40`} name={owner} size={16} square className={styles.avatar} />
            <span className={styles.repoText}>{fullName}</span>
          </a>
          <span className={styles.sep}>·</span>
          <span className="tabular">#{issue.number}</span>
          <span className={styles.sep}>·</span>
          <RelativeTime date={issue.created_at} />
          {issue.comments > 0 && (
            <>
              <span className={styles.sep}>·</span>
              <span className={styles.metaItem}>
                <IconMessageSquare size={12} /> {issue.comments}
              </span>
            </>
          )}
        </div>

        <Link href={`/issues/${owner}/${repo}/${issue.number}`} className={`${styles.title} ${styles.stretch}`}>
          {issue.title}
        </Link>

        {(labels.length > 0 || (matchReasons && matchReasons.length > 0)) && !compact && (
          <div className={styles.tags}>
            {labels.map(label => (
              <Tag key={label.id ?? label.name} dot={label.color ? `#${label.color}` : undefined} title={label.description ?? undefined}>
                {label.name}
              </Tag>
            ))}
          </div>
        )}
      </div>

      <div className={styles.aside}>
        {bounty && <span className={styles.amount}>{bounty.amount}</span>}
        {typeof match === 'number' && match > 0 && (
          <span
            className={[styles.match, match >= 60 && styles.matchHigh].filter(Boolean).join(' ')}
            title={matchReasons?.length ? `Matches: ${matchReasons.join(', ')}` : 'Skill match'}
          >
            <span className={styles.matchValue}>{match}%</span> fit
          </span>
        )}
        <TrackControl
          issue={{
            url: issue.html_url,
            number: issue.number,
            repo: fullName,
            title: issue.title,
            description: issue.body,
            labels: (issue.labels ?? []).map(label => label.name),
            hasBounty: Boolean(bounty),
            bountyAmount: bounty?.amount ?? null,
            bountySource: bounty?.source ?? null,
          }}
        />
      </div>
    </li>
  );
}

export function IssueRowSkeleton({ count = 6, label = 'Loading issues' }: { count?: number; label?: string }) {
  return (
    <ul className={styles.list} aria-busy="true" aria-label={label}>
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className={styles.skeletonRow}>
          <Skeleton width={180} height={10} />
          <Skeleton width={`${60 + ((index * 13) % 30)}%`} height={13} />
          <div className={styles.skeletonTags}>
            <Skeleton width={72} height={18} />
            <Skeleton width={56} height={18} />
          </div>
        </li>
      ))}
    </ul>
  );
}
