'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import SiteNav from './SiteNav';
import SiteFooter from './SiteFooter';
import AccountMenu from './AccountMenu';
import CommandPalette from './CommandPalette';
import SpotlightProvider from '../fx/SpotlightProvider';
import LogoMark from '../LogoMark';
import { Button } from '../ui/Button';
import { IconMenu, IconX } from '../icons';
import styles from './Shell.module.css';

/** Routes that use the marketing layout (top nav + full footer). */
const MARKETING_ROUTES = new Set(['/']);

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPath, setDrawerPath] = useState(pathname);

  // Close the drawer whenever the route changes (derived during render).
  if (drawerPath !== pathname) {
    setDrawerPath(pathname);
    setDrawerOpen(false);
  }

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [drawerOpen]);

  if (MARKETING_ROUTES.has(pathname)) {
    return (
      <>
        <SiteNav />
        <main id="main">{children}</main>
        <SiteFooter />
        <CommandPalette />
        <SpotlightProvider />
      </>
    );
  }

  return (
    <div className={styles.app}>
      <Sidebar open={drawerOpen} onNavigate={() => setDrawerOpen(false)} />
      {drawerOpen && <div className={styles.scrim} onClick={() => setDrawerOpen(false)} aria-hidden="true" />}

      <div className={styles.main}>
        <header className={styles.mobileBar}>
          <div className={styles.mobileBarLeft}>
            <Button
              variant="ghost"
              iconOnly
              aria-label={drawerOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={drawerOpen}
              aria-controls="app-sidebar"
              onClick={() => setDrawerOpen(value => !value)}
            >
              {drawerOpen ? <IconX size={18} /> : <IconMenu size={18} />}
            </Button>
            <Link href="/" className={styles.brand}>
              <LogoMark size={20} />
              Orion
            </Link>
          </div>
          <AccountMenu variant="compact" />
        </header>

        <main id="main" className={styles.content}>
          {children}
        </main>
        <SiteFooter compact />
      </div>
      <CommandPalette />
      <SpotlightProvider />
    </div>
  );
}
