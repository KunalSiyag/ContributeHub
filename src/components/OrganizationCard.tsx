import { EventOrganization } from '@/lib/events';
import styles from './OrganizationCard.module.css';

interface OrganizationCardProps {
  org: EventOrganization;
}

export default function OrganizationCard({ org }: OrganizationCardProps) {
  const repoUrl = `https://github.com/${org.slug}`;
  
  // Get language color
  const languageColors: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    Python: '#3572A5',
    Java: '#b07219',
    Ruby: '#701516',
    Go: '#00ADD8',
    Rust: '#dea584',
  };
  
  const langColor = languageColors[org.language] || '#6e7681';

  // Format participation years
  const formatYears = (years?: number[]): string | null => {
    if (!years || years.length === 0) return null;
    if (years.length === 1) return `${years[0]}`;
    // Show range or individual years
    const sorted = [...years].sort((a, b) => a - b);
    if (sorted.length > 2) {
      return `${sorted[0]}-${sorted[sorted.length - 1]}`;
    }
    return sorted.join(', ');
  };

  const yearsDisplay = formatYears(org.participationYears);

  return (
    <a 
      href={repoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.card}
    >
      {/* Header with Name */}
      <div className={styles.header}>
        <h3 className={styles.name}>{org.name}</h3>
        <div className={styles.badges}>
          <div className={styles.eventBadge}>{org.eventLabel.toUpperCase()}</div>
          {yearsDisplay && (
            <div className={styles.yearBadge} title={`Participated in ${org.participationYears?.join(', ')}`}>
              📅 {yearsDisplay}
            </div>
          )}
        </div>
      </div>

      {/* Description - shows on hover */}
      <p className={styles.description}>{org.description}</p>

      {/* Topics/Tags */}
      <div className={styles.topics}>
        {org.topics.slice(0, 4).map(topic => (
          <span key={topic} className={styles.topic}>{topic}</span>
        ))}
      </div>

      {/* Stats Footer */}
      <div className={styles.footer}>
        <div className={styles.stats}>
          <span className={styles.stat}>
            <span style={{ background: langColor }} className={styles.langDot} />
            {org.language}
          </span>
          <span className={styles.stat}>
            ⭐ {org.stars.toLocaleString()}
          </span>
          <span className={styles.stat}>
            🔀 {org.forks.toLocaleString()}
          </span>
        </div>
      </div>
    </a>
  );
}
