'use client';

import { useRef, type ReactNode } from 'react';
import { gsap, MOTION_OK, useGSAP } from '@/lib/gsap';
import styles from './fx.module.css';

/**
 * Starts tipped back, as if lying on a desk, and stands upright as it
 * scrolls toward the middle of the screen. The resting tilt is in CSS, so the
 * first paint already has it and the script only takes over the scrubbing.
 */
export default function ScrollTilt({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          el,
          { rotateX: 14, scale: 0.96, transformPerspective: 1400, transformOrigin: '50% 0%' },
          {
            rotateX: 0,
            scale: 1,
            ease: 'none',
            scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 30%', scrub: 0.6 },
          }
        );
      });
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={[styles.tilt, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
