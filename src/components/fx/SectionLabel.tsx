import type { ReactNode } from 'react';
import styles from './fx.module.css';

/** Centered pill with fading rules on both sides, above a section heading. */
export default function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className={styles.label}>
      <span className={styles.rule} aria-hidden="true" />
      <span className={styles.pill}>{children}</span>
      <span className={`${styles.rule} ${styles.ruleEnd}`} aria-hidden="true" />
    </div>
  );
}
