import Link from 'next/link';
import { Repository } from '@/types';
import { formatNumber, timeAgo, getLanguageClass } from '@/lib/utils';
import { calculateRepoBadges } from '@/lib/badges';
import { BadgeList } from './Badge';
import styles from './ProjectCard.module.css';

interface ProjectCardProps {
  repo: Repository;
  matchScore?: number;
  participationTags?: string[];
}

// Simple momentum sparkline component
function MomentumSparkline({ activity }: { activity: number }) {
  // Generate mock activity data based on stars (simplified)
  const bars = [0.3, 0.5, 0.4, 0.8, 0.6, 1.0, 0.7].map((v, i) => (
    <div
      key={i}
      className={styles.sparkBar}
      style={{
        height: `${Math.max(20, v * 100 * (activity > 0.5 ? 1 : 0.6))}%`,
        opacity: 0.3 + (i / 7) * 0.7,
      }}
    />
  ));
  
  return <div className={styles.sparkline}>{bars}</div>;
}

export default function ProjectCard({ repo, matchScore, participationTags = [] }: ProjectCardProps) {
  // Calculate badges
  const badges = calculateRepoBadges(repo);
  
  // Calculate activity score (0-1)
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const activityScore = Math.max(0, 1 - daysSinceUpdate / 30);

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
                🎯 {matchScore}% match
              </span>
            )}
          </div>
          {/* Gamified Badges */}
          <div className={styles.badgesRow}>
            <BadgeList badges={badges} maxBadges={3} size="sm" />
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
          
          {/* Momentum Sparkline */}
          <div className={styles.momentum}>
            <MomentumSparkline activity={activityScore} />
            <span className={styles.updated}>
              Updated {timeAgo(repo.updated_at)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

