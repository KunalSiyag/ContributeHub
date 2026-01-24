import Link from 'next/link';
import { ContributionEvent } from '@/types';
import { getEventTimeInfo } from '@/lib/events';
import styles from './EventCard.module.css';

interface EventCardProps {
  event: ContributionEvent;
  variant?: 'default' | 'compact';
}

export default function EventCard({ event, variant = 'default' }: EventCardProps) {
  const timeInfo = getEventTimeInfo(event);
  
  const statusColors: Record<string, string> = {
    upcoming: styles.statusUpcoming,
    active: styles.statusActive,
    ended: styles.statusEnded,
  };

  return (
    <article className={`${styles.card} ${variant === 'compact' ? styles.compact : ''}`}>
      {/* Status Badge - Now Layout Relative (No Overlap) */}
      <div className={`${styles.status} ${statusColors[event.status || 'upcoming']}`}>
        {event.status === 'active' ? '🔥 Active Now' : event.status === 'upcoming' ? '📅 Upcoming' : '✅ Ended'}
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div 
          className={styles.logoPlaceholder}
          style={{ backgroundColor: event.color }}
        >
          {event.shortName.charAt(0)}
        </div>
        <div className={styles.info}>
          <h3 className={styles.name}>{event.name}</h3>
          <span className={styles.organizer}>by {event.organizer}</span>
        </div>
      </div>

      {/* Description */}
      <p className={styles.description}>{event.description}</p>

      {/* Labels */}
      <div className={styles.labels}>
        {event.labels.map(label => (
          <span key={label} className={styles.label}>
            {label}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        {event.participatingOrgs && (
          <span className={styles.stat}>
            <span className={styles.statIcon}>🏢</span>
            {event.participatingOrgs}+ orgs
          </span>
        )}
        {event.totalContributors && (
          <span className={styles.stat}>
            <span className={styles.statIcon}>👥</span>
            {event.totalContributors.toLocaleString()}+ contributors
          </span>
        )}
        {event.isPaid && (
          <span className={`${styles.stat} ${styles.paid}`}>
            <span className={styles.statIcon}>💰</span>
            Paid
          </span>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <span className={styles.timeInfo}>{timeInfo}</span>
        <div className={styles.actions}>
          <Link href={`/events/${event.slug}`} className={styles.detailsBtn}>
            View Details
          </Link>
          <a 
            href={event.website} 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.websiteBtn}
          >
            Website →
          </a>
        </div>
      </div>
    </article>
  );
}
