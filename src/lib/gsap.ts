import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

/*
 * GSAP for client components only. Plugins register once here; GSAP is safe
 * to import during server rendering, it only runs in effects.
 *
 * Motion rules (docs/DESIGN.md → Effects): GSAP drives one-shot,
 * scroll-linked and layout motion; endless loops stay in CSS, where they run
 * on the compositor. Every animation sits inside a
 * `(prefers-reduced-motion: no-preference)` matchMedia.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, DrawSVGPlugin);

/** Same curve as --ease-out (cubic-bezier(0.16, 1, 0.3, 1)). */
export const EASE_OUT = 'expo.out';
export const MOTION_OK = '(prefers-reduced-motion: no-preference)';

/** True when the element starts below the fold, so hiding it can't flash. */
export function belowFold(el: Element) {
  return el.getBoundingClientRect().top > window.innerHeight;
}

export { gsap, DrawSVGPlugin, ScrollTrigger, SplitText, useGSAP };
