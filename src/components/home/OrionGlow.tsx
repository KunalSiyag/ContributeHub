'use client';

import { useRef, type CSSProperties } from 'react';
import { usePauseOffscreen } from '@/hooks/usePauseOffscreen';
import { belowFold, EASE_OUT, gsap, MOTION_OK, useGSAP } from '@/lib/gsap';
import styles from './home.module.css';

type Star = readonly [x: number, y: number, r: number, opacity: number];

interface Glint {
  x: number;
  y: number;
  r: number;
  /** Fraction of the cycle to offset by, so glints flash at different times. */
  phase: number;
  peak: number;
}

/** The Orion constellation (same geometry as LogoMark), drawn at hero scale with light. */
const STARS: Array<[x: number, y: number, r: number]> = [
  [6.2, 4.6, 0.55],
  [17.3, 5.4, 0.42],
  [9.4, 11.4, 0.36],
  [12, 12.3, 0.36],
  [14.6, 13.2, 0.36],
  [7.5, 19.4, 0.4],
  [17.7, 19.1, 0.7],
];

/** Fixed-seed randomness, so server and client markup match. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

/** Faint background stars of varied brightness. */
function dust(count: number, minR: number, maxR: number): Star[] {
  const next = seeded(7);
  return Array.from({ length: count }, () => {
    const [x, y, r] = [next() * 24, next() * 24, minR + next() * (maxR - minR)];
    return [x, y, r, 0.2 + next() * 0.5] as const;
  });
}

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Where the hero field shows: two clusters either side of the copy (clear
 * across the middle 13 units, wider than the headline at every breakpoint),
 * fading out at the field's edges and toward the product preview below.
 */
function sides(x: number, y: number) {
  const dx = Math.abs(x - 12);
  return smoothstep(6.5, 8.5, dx) * (1 - smoothstep(10.5, 12, dx)) * smoothstep(0.5, 2, y) * (1 - smoothstep(10, 15, y));
}

const DUST = dust(46, 0.05, 0.14);

/*
 * The field is drawn ~3x larger than the constellation, so its stars are
 * finer. Its fade is baked into each star rather than masked in CSS, so the
 * glints above it stay small independent layers.
 */
const FIELD = dust(160, 0.012, 0.045)
  .map(([x, y, r, opacity]) => [x, y, r, opacity * 0.6 * sides(x, y)] as const)
  .filter(([, , , opacity]) => opacity > 0.02);

/*
 * Twinkle comes from a few HTML glints over the static art. Their opacity
 * animates on the compositor and rests between flashes; twinkling SVG stars
 * would repaint the whole field every frame.
 */
const FIELD_GLINTS: Glint[] = (() => {
  const next = seeded(11);
  return Array.from({ length: 10 }, (_, i) => {
    // Alternate sides, inside the clusters.
    const x = 12 + (i % 2 === 0 ? -1 : 1) * (8.2 + next() * 2.4);
    const y = 2.5 + next() * 8;
    return { x, y, r: 0.03 + next() * 0.02, phase: next(), peak: 0.4 + 0.5 * sides(x, y) };
  });
})();

const STAR_GLINTS: Glint[] = STARS.map(([x, y, r], i) => ({ x, y, r: r * 0.6, phase: i / STARS.length, peak: 0.9 }));

const GLINT_CYCLE = 7; // seconds; keep in step with .glint in home.module.css
const pct = (units: number) => `${((units / 24) * 100).toFixed(3)}%`;

interface OrionGlowProps {
  /** Positions and sizes the art; it is square. */
  className?: string;
  /** Prefix for SVG ids when used twice on a page. */
  id?: string;
  /** Only the twinkling star field, without the constellation (behind text). */
  starfield?: boolean;
}

export default function OrionGlow({ className, id = 'orion', starfield = false }: OrionGlowProps) {
  const ref = useRef<HTMLDivElement>(null);
  usePauseOffscreen(ref);

  // The constellation assembles the first time it scrolls into view: stars
  // light up in turn, then the lines draw between them.
  useGSAP(
    () => {
      const root = ref.current;
      if (starfield || !root) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        if (!belowFold(root)) return;
        const stars = root.querySelectorAll('[data-star]');
        const lines = root.querySelectorAll('[data-lines] path');
        const dust = root.querySelector('[data-dust]');
        const glints = root.querySelectorAll(`.${styles.glint}`);
        gsap.set(stars, { scale: 0, transformOrigin: '50% 50%' });
        gsap.set(lines, { drawSVG: '0%' });
        gsap.set(dust, { opacity: 0 });
        gsap.set(glints, { visibility: 'hidden' });

        gsap
          .timeline({ scrollTrigger: { trigger: root, start: 'top 85%', once: true }, defaults: { ease: EASE_OUT } })
          .to(dust, { opacity: 1, duration: 1.2 }, 0)
          .to(stars, { scale: 1, duration: 0.7, stagger: 0.1, ease: 'back.out(2.2)' }, 0.1)
          .to(lines, { drawSVG: '100%', duration: 1.4, ease: 'power2.inOut' }, 0.35)
          .set(glints, { visibility: 'visible' });
      });
    },
    { scope: ref, dependencies: [starfield] }
  );

  return (
    <div className={className} aria-hidden="true">
      <div ref={ref} className={[styles.orion, starfield && styles.starfield].filter(Boolean).join(' ')}>
        <svg viewBox="0 0 24 24" fill="none" className={styles.orionArt}>
          <defs>
            <linearGradient id={`${id}-spectrum`} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0" style={{ stopColor: 'var(--accent)' }} />
              <stop offset="0.45" style={{ stopColor: 'var(--fg)' }} />
              <stop offset="1" style={{ stopColor: 'var(--status-review)' }} />
            </linearGradient>
            <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.35" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id={`${id}-halo`}>
              <stop offset="0" style={{ stopColor: 'var(--fg)', stopOpacity: 0.5 }} />
              <stop offset="1" style={{ stopColor: 'var(--fg)', stopOpacity: 0 }} />
            </radialGradient>
          </defs>

          <g style={{ fill: 'var(--fg)' }} data-dust>
            {(starfield ? FIELD : DUST).map(([x, y, r, opacity], i) => (
              <circle key={i} cx={x} cy={y} r={r} opacity={opacity.toFixed(2)} />
            ))}
          </g>

          {!starfield && (
            <>
              <g
                stroke={`url(#${id}-spectrum)`}
                strokeWidth="0.08"
                strokeLinecap="round"
                filter={`url(#${id}-glow)`}
                data-lines
              >
                <path d="M6.2 4.6 9.4 11.4M17.3 5.4l-2.7 7.8M9.4 11.4l2.6.9 2.6.9M9.4 11.4l-1.9 8M14.6 13.2l3.1 5.9" />
              </g>

              {STARS.map(([cx, cy, r]) => (
                <g key={`${cx}-${cy}`} data-star>
                  <circle cx={cx} cy={cy} r={r * 3} fill={`url(#${id}-halo)`} className={styles.halo} />
                  <circle cx={cx} cy={cy} r={r} style={{ fill: 'var(--fg)' }} filter={`url(#${id}-glow)`} />
                </g>
              ))}
              <circle cx="17.7" cy="19.1" r="1.6" style={{ stroke: 'var(--fg)' }} strokeWidth="0.04" strokeOpacity="0.4" />
            </>
          )}
        </svg>

        {(starfield ? FIELD_GLINTS : STAR_GLINTS).map(({ x, y, r, phase, peak }, i) => (
          <span
            key={i}
            className={styles.glint}
            style={
              {
                left: pct(x),
                top: pct(y),
                width: pct(r * 2),
                '--peak': peak.toFixed(2),
                animationDelay: `${(-phase * GLINT_CYCLE).toFixed(2)}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
