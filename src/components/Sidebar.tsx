'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getStoredTheme, setStoredTheme, applyTheme } from '@/lib/utils';
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
  { label: 'Resume Based', href: '/resume', icon: '📄' },
];

const dashboardNav: NavItem[] = [
  { label: 'All Issues', href: '/dashboard', icon: '📋', requiresAuth: true },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed: propsCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, signInWithGitHub, signOut, loading } = useAuth();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Use props if provided, otherwise internal state
  const isControlled = propsCollapsed !== undefined;
  const collapsed = isControlled ? propsCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (isControlled && onToggle) {
      onToggle(!collapsed);
    } else {
      setInternalCollapsed(!collapsed);
    }
  };

  useEffect(() => {
    setMounted(true);
    const storedTheme = getStoredTheme();
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setTheme(storedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    setStoredTheme(newTheme);
    applyTheme(newTheme);
  };

  const handleLogin = async () => {
    try {
      await signInWithGitHub();
    } catch (err) {
      console.error('Sidebar login error:', err);
    }
  };

  const handleSignOut = async () => {
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
        onClick={() => setMobileMenuOpen(false)}
      >
        <span className={styles.navIcon}>{item.icon}</span>
        {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className={styles.mobileHeader}>
        <div className={styles.mobileLogo}>
          <span className={styles.logoIcon}>⬡</span>
          <span className={`${styles.logoText} orionText`}>Orion</span>
        </div>
        <button 
          className={styles.mobileMenuToggle}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className={styles.overlay} 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileMenuOpen ? styles.mobileOpen : ''}`}>
        {/* Logo (Desktop) */}
        <div className={styles.logoSection}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoIcon}>⬡</span>
            {!collapsed && <span className={`${styles.logoText} orionText`}>Orion</span>}
          </Link>
          <button 
            type="button"
            className={styles.collapseBtn}
            onClick={handleToggle}
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

          {/* Dashboard (Always show, disabled if not logged in) */}
          <div className={styles.navSection}>
            {!collapsed && <span className={styles.sectionLabel}>MY DASHBOARD</span>}
            {mounted && user ? (
              dashboardNav.map(renderNavItem)
            ) : (
              dashboardNav.map((item) => (
                <div
                  key={item.href}
                  className={`${styles.navItem} ${styles.disabled}`}
                  title="Login to access your dashboard"
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
                  {!collapsed && <span className={styles.lockIcon}>🔒</span>}
                </div>
              ))
            )}
          </div>
        </nav>

        {/* Theme Toggle & User Section */}
        <div className={styles.userSection}>
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className={styles.themeToggle}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'transparent',
              border: 'none',
              borderTop: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              justifyContent: collapsed ? 'center' : 'flex-start',
              marginBottom: '10px'
            }}
          >
             <span style={{ fontSize: '1.2rem' }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
             {!collapsed && <span>{mounted ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : 'Dark Mode'}</span>}
          </button>

          {!mounted ? (
            <div className={styles.loading}>
              <span style={{ fontSize: '1.5rem', animation: 'spin 1s linear infinite' }}>⬡</span>
            </div>
          ) : loading ? (
            <div className={styles.loading}>
              <span style={{ fontSize: '1.5rem', animation: 'spin 1s linear infinite' }}>⬡</span>
            </div>
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
    </>
  );
}
