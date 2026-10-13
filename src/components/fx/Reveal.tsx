'use client';

import { useRef, type ReactNode } from 'react';
import { belowFold, EASE_OUT, gsap, MOTION_OK, ScrollTrigger, SplitText, useGSAP } from '@/lib/gsap';

interface RevealProps {
  children: ReactNode;
  as?: 'div' | 'section' | 'li';
  /** Stagger siblings by passing increasing delays (ms). */
  delay?: number;
  className?: string;
  id?: string;
  'aria-labelledby'?: string;
}

/**
 * Fades and lifts its content in the first time it scrolls into view; any
 * heading inside marked `data-split` rises line by line. Content that is
 * already on screen when the page loads is left alone, so nothing is hidden
 * before the script runs and nothing flashes.
 */
export default function Reveal({ children, as: Tag = 'div', delay = 0, className, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        if (!belowFold(el)) return;
        gsap.set(el, { autoAlpha: 0, y: 24 });
        let splits: SplitText[] = [];

        ScrollTrigger.create({
          trigger: el,
          start: 'top 88%',
          once: true,
          onEnter: () => {
            // Split now, not on load: fonts are in and the layout is final.
            splits = [...el.querySelectorAll<HTMLElement>('[data-split]')].map(heading =>
              SplitText.create(heading, { type: 'lines', mask: 'lines' })
            );
            const tl = gsap.timeline({
              delay: delay / 1000,
              defaults: { ease: EASE_OUT },
              onComplete: () => splits.forEach(split => split.revert()),
            });
            tl.to(el, { autoAlpha: 1, y: 0, duration: 0.9 });
            splits.forEach(split => {
              tl.from(split.lines, { yPercent: 105, duration: 1, stagger: 0.08 }, 0.05);
            });
          },
        });

        return () => splits.forEach(split => split.revert());
      });
    },
    { scope: ref }
  );

  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        ref.current = node;
      }}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  );
}
