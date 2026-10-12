import Link from 'next/link';
import type { Repository } from '@/types';
import { formatNumber } from '@/lib/utils';
import { Avatar, LanguageDot, Skeleton, Tag } from './ui/primitives';
import RelativeTime from './RelativeTime';
import SaveRepoButton from './SaveRepoButton';
import { IconCircleDot, IconExternalLink, IconGitFork, IconStar } from './icons';
import styles from './rows.module.css';

interface RepoRowProps {
  repo: Repository;
  match?: number | null;
  /** Extra tags, e.g. program participation. */
  extraTags?: string[];
}

export default function RepoRow({ repo, match, extraTags = [] }: RepoRowProps) {
  const goodFirstIssues = `https://github.com/${repo.full_name}/issues?q=${encodeURIComponent('is:issue is:open label:"good first issue"')}`;

  return (
    <li className={`${styles.row} ${styles.withLead}`} data-spotlight="wash">
      <Avatar src={repo.owner.avatar_url} name={repo.owner.login} size={36} square />
      <div className={styles.main}>
        <Link href={`/repos/${repo.full_name}`} className={`${styles.title} ${styles.stretch}`}>
          {repo.full_name}
        </Link>
        {repo.description && <p className={styles.description}>{repo.description}</p>}
        <div className={styles.meta}>
          <LanguageDot language={repo.language} />
          <span className={styles.metaItem} title={`${repo.stargazers_count.toLocaleString()} stars`}>
            <IconStar size={13} /> {formatNumber(repo.stargazers_count)}
          </span>
          <span className={styles.metaItem} title={`${repo.forks_count.toLocaleString()} forks`}>
            <IconGitFork size={13} /> {formatNumber(repo.forks_count)}
          </span>
          <span className={styles.metaItem} title="Open issues and pull requests">
            <IconCircleDot size={13} /> {formatNumber(repo.open_issues_count)} open
          </span>
          {repo.pushed_at && (
            <span className={styles.metaItem}>
              <RelativeTime date={repo.pushed_at} prefix="pushed" />
            </span>
          )}
        </div>
        {(extraTags.length > 0 || (repo.topics ?? []).length > 0) && (
          <div className={styles.tags}>
            {extraTags.map(tag => (
              <Tag key={tag}>
                {tag}
              </Tag>
            ))}
            {(repo.topics ?? []).slice(0, 4).map(topic => (
              <Tag key={topic} tone="muted">
                {topic}
              </Tag>
            ))}
          </div>
        )}
      </div>
      <div className={styles.aside}>
        {typeof match === 'number' && match > 0 && (
          <span className={[styles.match, match >= 60 && styles.matchHigh].filter(Boolean).join(' ')} title="Skill match">
            <span className={styles.matchValue}>{match}%</span> fit
          </span>
        )}
        <a
          href={goodFirstIssues}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.externalIcon}
          title="Good first issues on GitHub"
          aria-label={`Good first issues in ${repo.full_name}`}
        >
          <IconExternalLink size={15} />
        </a>
        <SaveRepoButton repo={repo} />
      </div>
    </li>
  );
}

export function RepoRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className={styles.list} aria-busy="true" aria-label="Loading repositories">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className={`${styles.skeletonRow} ${styles.skeletonRowLead}`}>
          <Skeleton width={36} height={36} radius={6} />
          <div className={styles.skeletonBody}>
            <Skeleton width={200} height={13} />
            <Skeleton width={`${55 + ((index * 17) % 35)}%`} height={10} />
            <Skeleton width={240} height={10} />
          </div>
        </li>
      ))}
    </ul>
  );
}
