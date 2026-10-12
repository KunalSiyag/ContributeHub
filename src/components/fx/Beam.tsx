'use client';

import { useRef } from 'react';
import { usePauseOffscreen } from '@/hooks/usePauseOffscreen';

/**
 * A slow light travelling around a highlighted card's border (globals.css →
 * .fx-beam). Place it inside a positioned card. It rests while the card is
 * off screen.
 */
export default function Beam() {
  const ref = useRef<HTMLSpanElement>(null);
  usePauseOffscreen(ref);
  return <span ref={ref} className="fx-beam" aria-hidden="true" />;
}
