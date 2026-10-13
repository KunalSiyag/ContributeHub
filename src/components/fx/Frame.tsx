import type { ReactNode } from 'react';
import styles from './fx.module.css';

interface FrameProps {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'ul' | 'figure';
  /** Hide the corner markers (e.g. when frames tile edge to edge). */
  plain?: boolean;
  'aria-labelledby'?: string;
  'aria-label'?: string;
}

/** Dashed blueprint frame with + markers on its corners (DESIGN.md → Frames). */
export default function Frame({ children, className, as: Tag = 'div', plain = false, ...rest }: FrameProps) {
  return (
    <Tag className={[styles.frame, className].filter(Boolean).join(' ')} {...rest}>
      {!plain && (
        <>
          <span className={`${styles.cross} ${styles.tl}`} aria-hidden="true" />
          <span className={`${styles.cross} ${styles.tr}`} aria-hidden="true" />
          <span className={`${styles.cross} ${styles.bl}`} aria-hidden="true" />
          <span className={`${styles.cross} ${styles.br}`} aria-hidden="true" />
        </>
      )}
      {children}
    </Tag>
  );
}
