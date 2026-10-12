import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/Button';
import styles from './not-found.module.css';

export const metadata: Metadata = {
  title: 'Program not found',
  robots: { index: false },
};

export default function ProgramNotFound() {
  return (
    <div className={styles.wrap}>
      <span className="eyebrow">Programs</span>
      <h1 className={styles.title}>There&rsquo;s no program at this address</h1>
      <p className={styles.body}>
        The link may point to an edition too far ahead to schedule, or to a program Orion doesn&rsquo;t track. The
        programs page lists every edition with dates.
      </p>
      <div className={styles.actions}>
        <ButtonLink href="/events" variant="primary">
          See all programs
        </ButtonLink>
      </div>
    </div>
  );
}
