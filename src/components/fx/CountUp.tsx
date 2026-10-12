'use client';

import { useEffect, useRef } from 'react';

interface CountUpProps {
  value: number;
  prefix?: string;
  suffix?: string;
  /** Milliseconds for the count, eased out. */
  duration?: number;
}

const format = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * Renders the final number on the server, then counts up to it the first
 * time it scrolls into view. Reduced-motion users only ever see the number.
 */
export default function CountUp({ value, prefix = '', suffix = '', duration = 1400 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    const final = `${prefix}${format(value)}${suffix}`;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = t < 1 ? `${prefix}${format(value * eased)}${suffix}` : final;
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        run();
      }
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      el.textContent = final;
    };
  }, [value, prefix, suffix, duration]);

  return (
    <span ref={ref} className="tabular">
      {prefix}
      {format(value)}
      {suffix}
    </span>
  );
}
