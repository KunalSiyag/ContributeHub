import { EASE_OUT, MOTION_OK, gsap } from '@/lib/gsap';

/*
 * Rows that come and go in editable lists (alert rules, bot commands), timed
 * from the Refero motion guide: an added row fades in and settles 6px over
 * 200ms; a removed one fades and collapses over 180ms. Nothing moves when the
 * visitor prefers reduced motion.
 */

const motionOk = () => typeof window !== 'undefined' && window.matchMedia(MOTION_OK).matches;

export function enterRow(el: Element | null) {
  if (!el || !motionOk()) return;
  gsap.fromTo(el, { autoAlpha: 0, y: -6 }, { autoAlpha: 1, y: 0, duration: 0.2, ease: EASE_OUT, clearProps: 'opacity,visibility,transform' });
}

/** Animates the row away, then calls `done` (which removes it from state). */
export function leaveRow(el: Element | null, done: () => void) {
  if (!el || !motionOk()) {
    done();
    return;
  }
  gsap.to(el, {
    autoAlpha: 0,
    height: 0,
    paddingTop: 0,
    paddingBottom: 0,
    marginTop: 0,
    marginBottom: 0,
    overflow: 'hidden',
    duration: 0.18,
    ease: 'power1.out',
    onComplete: done,
  });
}
