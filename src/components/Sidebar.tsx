'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Sidebar.module.css';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  requiresAuth?: boolean;
}

const generalNav: NavItem[] = [
  { label: 'Home', href: '/', icon: '🏠' },
  { label: 'Discover', href: '/discover', icon: '🔍' },
  { label: 'Events', href: '/events', icon: '🎉' },
  { label: 'Bounties', href: '/bounties', icon: '💰' },
  { label: 'Trending', href: '/discover?sort=stars', icon: '📈' },
];

const dashboardNav: NavItem[] = [
  { label: 'All Issues', href: '/dashboard', icon: '📋', requiresAuth: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signInWithGitHub, signOut, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async () => {
    console.log('Sidebar: Login clicked');
    try {
      await signInWithGitHub();
    } catch (err) {
      console.error('Sidebar login error:', err);
    }
  };

  const handleSignOut = async () => {
    console.log('Sidebar: Sign out clicked');
    try {
      await signOut();
    } catch (err) {
      console.error('Sidebar sign out error:', err);
    }
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href.split('?')[0]);
  };

  const renderNavItem = (item: NavItem) => {
    if (item.requiresAuth && !user) return null;
    
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
      >
        <span className={styles.navIcon}>{item.icon}</span>
        {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Logo */}
      <div className={styles.logoSection}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>⬡</span>
          {!collapsed && <span className={styles.logoText}>ContributeHub</span>}
        </Link>
        <button 
          type="button"
          className={styles.collapseBtn}
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className={styles.nav}>
        {/* General */}
        <div className={styles.navSection}>
          {!collapsed && <span className={styles.sectionLabel}>GENERAL</span>}
          {generalNav.map(renderNavItem)}
        </div>

        {/* Dashboard (Auth Required) */}
        {mounted && user && (
          <div className={styles.navSection}>
            {!collapsed && <span className={styles.sectionLabel}>MY DASHBOARD</span>}
            {dashboardNav.map(renderNavItem)}
          </div>
        )}

        {/* Settings */}
        <div className={styles.navSection}>
          {!collapsed && <span className={styles.sectionLabel}>CONTACT US</span>}
          <Link href="/settings" className={styles.navItem}>
            <span className={styles.navIcon}>⚙️</span>
            {!collapsed && <span className={styles.navLabel}>Settings</span>}
          </Link>
          <a 
            href="https://github.com/ContributeHub" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.navItem}
          >
            <span className={styles.navIcon}>❤️</span>
            {!collapsed && <span className={styles.navLabel}>Submit &lt;3</span>}
          </a>
        </div>
      </nav>

      {/* User Section */}
      <div className={styles.userSection}>
        {!mounted ? (
          <div className={styles.loading}>...</div>
        ) : loading ? (
          <div className={styles.loading}>...</div>
        ) : user ? (
          <div className={styles.userInfo}>
            <img 
              src={user.user_metadata?.avatar_url || '/default-avatar.png'} 
              alt="Avatar" 
              className={styles.userAvatar}
            />
            {!collapsed && (
              <div className={styles.userDetails}>
                <span className={styles.userName}>{user.user_metadata?.user_name}</span>
                <button type="button" onClick={handleSignOut} className={styles.signOutBtn}>Sign Out</button>
              </div>
            )}
          </div>
        ) : (
          <button type="button" onClick={handleLogin} className={styles.loginBtn}>
            <span className={styles.navIcon}>🔐</span>
            {!collapsed && <span>Login with GitHub</span>}
          </button>
        )}
      </div>
    </aside>
  );
}

