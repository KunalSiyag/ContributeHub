import { IssueRowSkeleton } from '@/components/IssueRow';
import { Skeleton } from '@/components/ui/primitives';
import BountyStats from './BountyStats';
import styles from './page.module.css';

/** Placeholder matching the stats strip, toolbar and rows of BountiesClient. */
export default function BountiesSkeleton() {
  return (
    <div className={styles.root}>
      <span className="visually-hidden" role="status">
        Loading bounties…
      </span>
      <div aria-hidden="true">
        <BountyStats summary={null} loading />
        <div className={styles.toolbarSkeleton}>
          <Skeleton height={32} radius="var(--r)" className={styles.toolbarSkeletonGrow} />
          <Skeleton width={176} height={32} radius="var(--r)" />
          <Skeleton width={148} height={32} radius="var(--r)" />
          <Skeleton width={160} height={32} radius="var(--r)" />
          <Skeleton width={128} height={32} radius="var(--r)" />
        </div>
        <div className={styles.resultsBar}>
          <Skeleton width={88} height={10} />
        </div>
      </div>
      <IssueRowSkeleton count={8} />
    </div>
  );
}
