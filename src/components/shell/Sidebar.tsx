'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAlerts } from '@/contexts/AlertsContext';
import LogoMark from '../LogoMark';
import AccountMenu from './AccountMenu';
import ThemeSwitch from './ThemeSwitch';
import { openCommandPalette } from './CommandPalette';
import { Kbd } from '../ui/primitives';
import {
  IconActivity,
  IconBell,
  IconBookOpen,
  IconBuilding,
  IconLayoutGrid,
  IconMessageSquare,
  IconRobot,
  IconRocket,
  IconCalendar,
  IconCoins,
  IconColumns,
  IconCompass,
  IconFileText,
  IconGift,
  IconHome,
  IconLock,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconTrendingUp,
  IconUser,
  IconX,
} from '../icons';
import styles from './Shell.module.css';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  match?: (pathname: string) => boolean;
  requiresAuth?: boolean;
  count?: 'tracked' | 'alerts';
}

const NAV: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Workspace',
    items: [
      { label: 'Overview', href: '/dashboard', icon: <IconHome />, requiresAuth: true },
      { label: 'Tracker', href: '/issues', icon: <IconColumns />, requiresAuth: true, count: 'tracked', match: p => p === '/issues' },
      { label: 'Alerts', href: '/alerts', icon: <IconBell />, requiresAuth: true, count: 'alerts' },
    ],
  },
  {
    label: 'Explore',
    items: [
      { label: 'Discover', href: '/discover', icon: <IconCompass />, match: p => p.startsWith('/discover') || /^\/issues\/[^/]+\//.test(p) },
      { label: 'Starter projects', href: '/starter', icon: <IconRocket /> },
      { label: 'Collections', href: '/collections', icon: <IconLayoutGrid />, match: p => p.startsWith('/collections') },
      { label: 'Rising', href: '/trending', icon: <IconTrendingUp /> },
      { label: 'Programs', href: '/events', icon: <IconCalendar /> },
      { label: 'Bounties', href: '/bounties', icon: <IconCoins /> },
      { label: 'Companies', href: '/companies', icon: <IconBuilding /> },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Repo report', href: '/repos', icon: <IconActivity />, match: p => p.startsWith('/repos') },
      { label: 'Repo bot', href: '/repo-bot', icon: <IconRobot /> },
      { label: 'Profiles', href: '/u', icon: <IconUser />, match: p => p === '/u' || p.startsWith('/u/') },
      { label: 'Leaderboard', href: '/leaderboard', icon: <IconTrendingUp /> },
    ],
  },
  {
    label: 'Grow',
    items: [
      { label: 'Assistant', href: '/assistant', icon: <IconSparkles /> },
      { label: 'Community', href: '/community', icon: <IconMessageSquare />, match: p => p.startsWith('/community') },
      { label: 'Resources', href: '/resources', icon: <IconBookOpen /> },
      { label: 'Perks', href: '/perks', icon: <IconGift /> },
      { label: 'Resume match', href: '/resume', icon: <IconFileText /> },
      { label: 'Preferences', href: '/preferences', icon: <IconSettings /> },
    ],
  },
];

const noop = () => () => {};

/** "⌘K" on Apple platforms, "Ctrl K" elsewhere (server render assumes ⌘). */
function useShortcutLabel() {
  return useSyncExternalStore(
    noop,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K'),
    () => '⌘K'
  );
}

interface SidebarProps {
  open: boolean;
  onNavigate: () => void;
}

export default function Sidebar({ open, onNavigate }: SidebarProps) {
  const pathname = usePathname() || '/';
  const { user, loading } = useAuth();
  const { issues } = useWorkspace();
  const shortcut = useShortcutLabel();
  const activeTracked = issues.filter(item => item.status !== 'completed').length;
  const { newTotal } = useAlerts();

  const isActive = (item: NavItem) =>
    item.match ? item.match(pathname) : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <aside
      id="app-sidebar"
      className={[styles.sidebar, open && styles.sidebarOpen].filter(Boolean).join(' ')}
      aria-label="Primary"
    >
      <div className={styles.sidebarHeader}>
        <Link href="/" className={styles.brand} onClick={onNavigate}>
          <LogoMark size={20} />
          Orion
        </Link>
        <button type="button" className={styles.drawerClose} onClick={onNavigate} aria-label="Close navigation">
          <IconX size={16} />
        </button>
      </div>

      <div className={styles.searchWrap}>
        <button type="button" className={styles.searchButton} onClick={openCommandPalette}>
          <IconSearch size={14} />
          <span>Search</span>
          <Kbd>{shortcut}</Kbd>
        </button>
      </div>

      <nav className={styles.sidebarScroll}>
        {NAV.map(group => (
          <div key={group.label} className={styles.navGroup}>
            <span className={`${styles.navGroupLabel} eyebrow`}>{group.label}</span>
            {group.items.map(item => {
              const locked = item.requiresAuth && !user && !loading;
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={styles.navItem}
                  aria-current={active ? 'page' : undefined}
                  onClick={onNavigate}
                  title={locked ? 'Sign in to use your workspace' : undefined}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                  {locked && (
                    <span className={styles.navLock} aria-label="Requires sign in">
                      <IconLock size={12} />
                    </span>
                  )}
                  {!locked && item.count === 'tracked' && activeTracked > 0 && (
                    <span className={styles.navCount}>{activeTracked}</span>
                  )}
                  {!locked && item.count === 'alerts' && newTotal > 0 && (
                    <span className={styles.navCount} title={`${newTotal} new matching issues`}>
                      {newTotal > 99 ? '99+' : newTotal}
                      <span className="visually-hidden"> new</span>
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.sidebarFooterRow}>
          <span className={styles.sidebarFooterLabel}>Theme</span>
          <ThemeSwitch />
        </div>
        <AccountMenu />
      </div>
    </aside>
  );
}
