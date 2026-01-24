'use client';

import { useEffect, useRef } from 'react';

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const LocomotiveScroll = (await import('locomotive-scroll')).default;
      const locomotiveScroll = new LocomotiveScroll();
    })();
  }, []);

  return (
    <div ref={scrollRef}>
      {children}
    </div>
  );
}
