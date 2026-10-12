'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(Flip);

const SELECTOR = '[data-flip-id]';

/**
 * Moves board cards to their new places with GSAP Flip, so a status change
 * reads as the card travelling to its column (and its neighbours closing the
 * gap) instead of vanishing and reappearing. Call the returned `capture()`
 * right before changing a status; the animation runs once the board commits.
 */
export function useBoardFlip(scope: RefObject<HTMLElement | null>, layoutKey: string) {
  const captured = useRef<Flip.FlipState | null>(null);

  useLayoutEffect(() => {
    const state = captured.current;
    captured.current = null;
    const root = scope.current;
    if (!state || !root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    Flip.from(state, {
      targets: root.querySelectorAll(SELECTOR),
      duration: 0.45,
      ease: 'power3.inOut',
      onEnter: entering => gsap.fromTo(entering, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.3 }),
    });
  }, [layoutKey, scope]);

  return () => {
    const root = scope.current;
    if (root) captured.current = Flip.getState(root.querySelectorAll(SELECTOR));
  };
}
