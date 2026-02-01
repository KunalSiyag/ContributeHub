'use client';

import Link from 'next/link';
import { Issue } from '@/types';
import { timeAgo, getLabelColor, extractRepoFromIssueUrl } from '@/lib/utils';
import { calculateIssueBadges } from '@/lib/badges';
import { BadgeList } from './Badge';
import IssueActions from './IssueActions';
import styles from './IssueCard.module.css';

interface IssueCardProps {
  issue: Issue;
  matchScore?: number;
  matchReasons?: string[];
}

export default function IssueCard({ issue, matchScore, matchReasons }: IssueCardProps) {
  const repoInfo = extractRepoFromIssueUrl(issue.repository_url);
  const repoName = repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : '';
  
  // Calculate badges for this issue
  const badges = calculateIssueBadges(issue);

  // Check if issue has bounty label
  const bountyLabel = issue.labels.find(l => 
    l.name.toLowerCase().includes('bounty') || 
    l.name.includes('💰') ||
    l.name.toLowerCase().includes('reward')
  );
  
  // Match score class
  const getMatchClass = (score: number) => {
    if (score >= 70) return styles.matchHigh;
    if (score >= 40) return styles.matchMedium;
    return styles.matchLow;
  };

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <div className={styles.badges}>
          {/* Match Score */}
          {matchScore !== undefined && matchScore > 0 && (
            <span className={`${styles.matchScore} ${getMatchClass(matchScore)}`}>
              🎯 {matchScore}% match
            </span>
          )}
          {/* Gamified badges */}
          <BadgeList badges={badges} maxBadges={2} />
        </div>
        <span className={styles.number}>#{issue.number}</span>
      </div>

      <div className={styles.labels}>
        {bountyLabel && (
          <span className={styles.bountyBadge}>💰</span>
        )}
        {issue.labels.slice(0, 3).map((label) => (
          <span
            key={label.id}
            className={`${styles.label} ${styles[getLabelColor(label.name).replace('label-', '')]}`}
            style={{
              backgroundColor: `#${label.color}20`,
              borderColor: `#${label.color}`,
            }}
          >
            {label.name}
          </span>
        ))}
      </div>

      <Link
        href={`/issues/${repoInfo?.owner}/${repoInfo?.repo}/${issue.number}`}
        className={styles.title}
      >
        {issue.title}
      </Link>

      {repoName && (
        <a
          href={`https://github.com/${repoName}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.repo}
        >
          📁 {repoName}
        </a>
      )}
      
      {/* Match reasons */}
      {matchReasons && matchReasons.length > 0 && (
        <div className={styles.matchReasons}>
          {matchReasons.slice(0, 3).map((reason, i) => (
            <span key={i} className={styles.reason}>✓ {reason}</span>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <div className={styles.meta}>
          <img
            src={issue.user.avatar_url}
            alt={`${issue.user.login} avatar`}
            className={styles.avatar}
            width={20}
            height={20}
          />
          <span className={styles.author}>
            by <strong>{issue.user.login}</strong>
          </span>
          <span className={styles.time}>
            {timeAgo(issue.created_at)}
          </span>
          <div className={styles.stats}>
            {issue.comments > 0 && (
              <span className={styles.stat} title="Comments">
                💬 {issue.comments}
              </span>
            )}
            {issue.reactions && issue.reactions.total_count > 0 && (
              <span className={styles.stat} title="Reactions/Stars">
                ⭐ {issue.reactions.total_count}
              </span>
            )}
          </div>
        </div>
        
        <IssueActions
          issue={{
            url: issue.html_url,
            number: issue.number,
            repo: repoName,
            title: issue.title,
            labels: issue.labels.map(l => l.name),
            hasBounty: !!bountyLabel,
          }}
        />
      </div>
    </article>
  );
}


