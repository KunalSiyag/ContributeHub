'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Marks the element data-paused while it is off screen, which pauses its
 * animations and its descendants' (globals.css → Effects). Decorative loops
 * otherwise keep costing frames after they scroll out of view.
 */
export function usePauseOffscreen(ref: RefObject<Element | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      el.toggleAttribute('data-paused', !entry.isIntersecting);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      el.removeAttribute('data-paused');
    };
  }, [ref]);
}
