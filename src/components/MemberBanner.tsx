import type { ProfileBanner } from '@/types/database';
import styles from './MemberBanner.module.css';

/** A member's chosen profile banner; purely decorative. */
export default function MemberBanner({ banner, className }: { banner: ProfileBanner; className?: string }) {
  return <div className={[styles.banner, styles[banner], className].filter(Boolean).join(' ')} aria-hidden="true" />;
}
