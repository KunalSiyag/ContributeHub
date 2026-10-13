import { IssueRowSkeleton } from '@/components/IssueRow';
import { PageHeader, Skeleton } from '@/components/ui/primitives';
import { Tabs } from '@/components/ui/Tabs';
import { HEADER, tabItems } from './discover-state';
import styles from './page.module.css';

const PILL_WIDTHS = [124, 98, 94, 74];

/** Server-rendered stand-in with the same geometry as the Issues tab. */
export default function DiscoverSkeleton() {
  return (
    <>
      <PageHeader eyebrow={HEADER.eyebrow} title={HEADER.title} description={HEADER.description} />
      <Tabs label="Discover sections" items={tabItems('')} value="issues" className={styles.tabs} />

      <div className={styles.filters} aria-hidden="true">
        <div className={styles.skeletonToolbar}>
          <Skeleton height={32} radius="var(--r)" className={styles.skeletonSearch} />
          <Skeleton width={150} height={32} radius="var(--r)" className={styles.skeletonSelect} />
          <Skeleton width={150} height={32} radius="var(--r)" className={styles.skeletonSelect} />
        </div>
        <div className={styles.chipRows}>
          <div className={styles.chips}>
            {PILL_WIDTHS.map(width => (
              <Skeleton key={width} width={width} height={28} radius="var(--r-full)" />
            ))}
          </div>
        </div>
      </div>

      <section className={styles.results} aria-busy="true">
        <div className={styles.resultsHead}>
          <h2 className={styles.count}>
            <span className={styles.countPending}>Searching GitHub…</span>
          </h2>
          <p className={styles.queryLine}>
            <Skeleton width="min(420px, 72%)" height={10} className={styles.querySkeleton} />
          </p>
        </div>
        <IssueRowSkeleton count={6} />
      </section>
    </>
  );
}
