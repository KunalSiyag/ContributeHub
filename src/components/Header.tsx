'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getStoredTheme, setStoredTheme, applyTheme } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Header.module.css';

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, loading, signInWithGitHub, signOut } = useAuth();

  useEffect(() => {
    setMounted(true);
    const storedTheme = getStoredTheme();
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setTheme(storedTheme);
    }
    applyTheme(storedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    setStoredTheme(newTheme);
    applyTheme(newTheme);
  };

  const handleLogin = async () => {
    console.log('Login button clicked');
    try {
      await signInWithGitHub();
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const handleSignOut = async () => {
    console.log('Sign out clicked');
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <>
      {/* Announcement Banner */}
      <div className={styles.announcementBanner}>
        <span className={styles.announcementTag}>NEW</span>
        <span>GSoC 2025 organizations announced!</span>
        <Link href="/events/gsoc-2025" className={styles.announcementLink}>
          View details →
        </Link>
      </div>

      <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.left}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoIcon}>⬡</span>
            <span className={styles.logoText}>ContributeHub</span>
          </Link>
          <nav className={styles.desktopNav}>
            <Link href="/" className={styles.navLink}>Home</Link>
            <Link href="/discover" className={styles.navLink}>Discover</Link>
            <Link href="/events" className={styles.navLink}>Events</Link>
            <Link href="/bounties" className={styles.navLink}>Bounties</Link>
            {mounted && user && <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>}
          </nav>
        </div>

        <nav className={`${styles.mobileNav} ${mobileMenuOpen ? styles.open : ''}`}>
           <Link href="/" className={styles.navLink}>Home</Link>
           <Link href="/discover" className={styles.navLink}>Discover</Link>
           <Link href="/events" className={styles.navLink}>Events</Link>
           <Link href="/bounties" className={styles.navLink}>Bounties</Link>
           {mounted && user && <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>}
        </nav>

        <div className={styles.actions}>
           <button 
             onClick={toggleTheme} 
             className={styles.themeToggle}
             aria-label="Toggle theme"
             type="button"
           >
             {mounted ? (theme === 'dark' ? '☀️' : '🌙') : '🌙'}
           </button>
           
          {/* User Menu or Login - only render dynamic content after mount */}
          {!mounted ? (
            <button className={styles.loginButton} type="button" disabled>
              <span className={styles.loginButtonInner}>Loading...</span>
            </button>
          ) : loading ? (
            <span className={styles.loadingDot}>...</span>
          ) : user ? (
            <div className={styles.userMenu}>
              <img 
                src={profile?.avatar_url || user.user_metadata?.avatar_url || '/default-avatar.png'} 
                alt="Avatar"
                className={styles.userAvatar}
              />
              <button onClick={handleSignOut} className={styles.signOutBtn} type="button">
                Sign Out
              </button>
            </div>
          ) : (
            <button onClick={handleLogin} className={styles.loginButton} type="button">
              <span className={styles.loginButtonInner}>Sign in with GitHub</span>
            </button>
          )}

          <button
            className={styles.mobileMenuButton}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            type="button"
          >
            <span className={styles.menuIcon}>{mobileMenuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>
    </header>
    </>
  );
}


