'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './HexagonLoader.module.css';

export default function GlobalLoader() {
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // Only show loader on Homepage
    if (pathname !== '/') {
      setMounted(false);
      setLoading(false);
      return;
    }

    // Show loader on route change
    setLoading(true);
    setMounted(true);

    const timer = setTimeout(() => {
      setLoading(false);
      // Wait for animation to finish before unmounting
      setTimeout(() => setMounted(false), 800); 
    }, 1000); // Minimum display time

    return () => clearTimeout(timer);
  }, [pathname]);

  if (!mounted || pathname !== '/') return null;

  return (
    <div className={`${styles.container} ${!loading ? styles.hidden : ''}`}>
      <div className={styles.loader}>
        <div className={styles.hexagonWrapper}>
          <div className={styles.ripple}></div>
          <div className={styles.ripple}></div>
          <span className={styles.hexagon}>⬡</span>
        </div>
        <div className={styles.text}>ORION</div>
      </div>
    </div>
  );
}
