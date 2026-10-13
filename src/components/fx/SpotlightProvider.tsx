'use client';

import { useEffect } from 'react';

/**
 * One pointer listener for the whole app. It positions the spotlight
 * (--mx/--my) on whichever [data-spotlight] element is under the pointer,
 * at most once per frame. Touch devices skip it entirely.
 */
export default function SpotlightProvider() {
  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return;
    let frame = 0;
    let pending: { el: HTMLElement; x: number; y: number } | null = null;

    const onMove = (event: PointerEvent) => {
      const el = (event.target as Element | null)?.closest?.<HTMLElement>('[data-spotlight]');
      if (!el) return;
      pending = { el, x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!pending) return;
        const rect = pending.el.getBoundingClientRect();
        pending.el.style.setProperty('--mx', `${pending.x - rect.left}px`);
        pending.el.style.setProperty('--my', `${pending.y - rect.top}px`);
      });
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
