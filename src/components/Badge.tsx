'use client';

import { Badge as BadgeType } from '@/lib/badges';
import styles from './Badge.module.css';

interface BadgeProps {
  badge: BadgeType;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export default function Badge({ badge, size = 'sm', showLabel = true }: BadgeProps) {
  return (
    <span 
      className={`${styles.badge} ${styles[size]}`}
      style={{ 
        '--badge-color': badge.color,
        backgroundColor: `${badge.color}15`,
        borderColor: `${badge.color}40`,
      } as React.CSSProperties}
      title={badge.label}
    >
      <span className={styles.emoji}>{badge.emoji}</span>
      {showLabel && <span className={styles.label}>{badge.label}</span>}
    </span>
  );
}

interface BadgeListProps {
  badges: BadgeType[];
  maxBadges?: number;
  size?: 'sm' | 'md';
}

export function BadgeList({ badges, maxBadges = 3, size = 'sm' }: BadgeListProps) {
  if (!badges.length) return null;
  
  const displayBadges = badges.slice(0, maxBadges);
  
  return (
    <div className={styles.badgeList}>
      {displayBadges.map((badge) => (
        <Badge key={badge.type} badge={badge} size={size} showLabel={size === 'md'} />
      ))}
    </div>
  );
}
