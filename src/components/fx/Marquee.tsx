'use client';

import { useRef, type CSSProperties, type ReactNode } from 'react';
import { usePauseOffscreen } from '@/hooks/usePauseOffscreen';
import styles from './fx.module.css';

interface MarqueeProps {
  children: ReactNode;
  label: string;
  /** Seconds per loop; longer is calmer. */
  duration?: number;
  gap?: number;
}

/**
 * Endless horizontal scroll that pauses on hover or focus and while off
 * screen. The second copy is inert, so keyboards and screen readers meet
 * each item once; under reduced motion it becomes a plain scrollable row.
 */
export default function Marquee({ children, label, duration = 80, gap = 40 }: MarqueeProps) {
  const ref = useRef<HTMLDivElement>(null);
  usePauseOffscreen(ref);

  const style = { '--marquee-duration': `${duration}s`, '--marquee-gap': `${gap}px` } as CSSProperties;
  return (
    <div ref={ref} className={styles.marquee} style={style} role="region" aria-label={label}>
      <div className={styles.track}>
        <div className={styles.group}>{children}</div>
        <div className={styles.group} inert>
          {children}
        </div>
      </div>
    </div>
  );
}
