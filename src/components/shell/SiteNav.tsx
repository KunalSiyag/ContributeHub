'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSignIn } from '../auth/SignIn';
import LogoMark from '../LogoMark';
import { Button, ButtonLink } from '../ui/Button';
import AccountMenu from './AccountMenu';
import { IconLogIn, IconMenu, IconX } from '../icons';
import styles from './Shell.module.css';

const LINKS = [
  { label: 'Discover', href: '/discover' },
  { label: 'Programs', href: '/events' },
  { label: 'Bounties', href: '/bounties' },
  { label: 'Resources', href: '/resources' },
];

export default function SiteNav() {
  const { user, loading } = useAuth();
  const { openSignIn } = useSignIn();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const actions = loading ? null : user ? (
    <>
      <ButtonLink href="/dashboard" variant="primary" size="sm" pill>
        Open workspace
      </ButtonLink>
      <AccountMenu variant="compact" />
    </>
  ) : (
    <Button variant="primary" size="sm" pill onClick={() => openSignIn('/dashboard')}>
      <IconLogIn size={14} />
      Sign in
    </Button>
  );

  return (
    <header className={[styles.siteNav, (scrolled || open) && styles.siteNavScrolled].filter(Boolean).join(' ')}>
      <div className={`container ${styles.siteNavInner}`}>
        <Link href="/" className={styles.brand} aria-label="Orion home">
          <LogoMark size={20} />
          Orion
        </Link>

        <nav className={styles.siteLinks} aria-label="Primary">
          {LINKS.map(link => (
            <Link key={link.href} href={link.href} className={styles.siteLink}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={`${styles.siteActions} ${styles.siteActionsDesktop}`}>{actions}</div>

        <Button
          variant="ghost"
          iconOnly
          className={styles.siteMenuButton}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="site-drawer"
          onClick={() => setOpen(value => !value)}
        >
          {open ? <IconX size={18} /> : <IconMenu size={18} />}
        </Button>
      </div>

      {open && (
        <nav id="site-drawer" className={styles.siteDrawer} aria-label="Primary">
          {LINKS.map(link => (
            <Link key={link.href} href={link.href} className={styles.siteLink} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <div className={styles.siteDrawerActions}>
            {user ? (
              <ButtonLink href="/dashboard" variant="primary" size="lg" full>
                Open workspace
              </ButtonLink>
            ) : (
              <Button
                variant="primary"
                size="lg"
                full
                onClick={() => {
                  setOpen(false);
                  openSignIn('/dashboard');
                }}
              >
                <IconLogIn size={15} />
                Sign in
              </Button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
