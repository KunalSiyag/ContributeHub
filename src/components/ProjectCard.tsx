import Link from 'next/link';
import { Repository } from '@/types';
import { formatNumber, timeAgo, getLanguageClass } from '@/lib/utils';
import styles from './ProjectCard.module.css';

interface ProjectCardProps {
  repo: Repository;
  matchScore?: number;
  participationTags?: string[];
}

export default function ProjectCard({ repo, matchScore, participationTags = [] }: ProjectCardProps) {
  return (
    <article className={styles.card}>
      <img
        src={repo.owner.avatar_url}
        alt={`${repo.owner.login} avatar`}
        className={styles.avatar}
        width={64}
        height={64}
      />
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.title}
            >
              <span className={styles.owner}>{repo.owner.login}/</span>
              <span className={styles.name}>{repo.name}</span>
            </a>
            {matchScore !== undefined && matchScore > 0 && (
              <span className={styles.matchBadge}>
                {matchScore}% match
              </span>
            )}
          </div>
        </div>

      <p className={styles.description}>
        {repo.description || 'No description available'}
      </p>

      {repo.topics.length > 0 && (
        <div className={styles.topics}>
          {repo.topics.slice(0, 5).map((topic) => (
            <span key={topic} className={styles.topic}>
              {topic}
            </span>
          ))}
          {repo.topics.length > 5 && (
            <span className={styles.moreTopic}>+{repo.topics.length - 5}</span>
          )}
        </div>
      )}

      <div className={styles.footer}>
        {participationTags.length > 0 && (
          <div className={styles.participationTags}>
             {participationTags.map(tag => (
               <span key={tag} className={styles.participationTag}>
                 {tag}
               </span>
             ))}
          </div>
        )}
        <div className={styles.stats}>
          {repo.language && (
            <span className={styles.stat}>
              <span className={`${styles.langDot} ${styles[getLanguageClass(repo.language)]}`} />
              {repo.language}
            </span>
          )}
          <span className={styles.stat}>
            <span className={styles.icon}>⭐</span>
            {formatNumber(repo.stargazers_count)}
          </span>
          <span className={styles.stat}>
            <span className={styles.icon}>🔀</span>
            {formatNumber(repo.forks_count)}
          </span>
          <span className={styles.stat}>
            <span className={styles.icon}>🔓</span>
            {repo.open_issues_count} issues
          </span>
        </div>
        <span className={styles.updated}>
          Updated {timeAgo(repo.updated_at)}
        </span>
      </div>
      </div>
    </article>
  );
}
