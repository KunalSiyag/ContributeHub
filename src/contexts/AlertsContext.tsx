'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { AlertsState, CheckedAlert } from '@/lib/alerts.server';

/*
 * Keeps the signed-in member's alert counts fresh while Orion is open: one
 * check on sign-in, then every ten minutes and when the tab comes back after
 * a while (never while it's hidden). The sidebar shows the total, and browser
 * notifications report increases after the first check of the session.
 */

const POLL_MS = 10 * 60_000;
const STALE_MS = 2 * 60_000;
const NOTIFY_KEY = 'orion_alert_notifications';

export type NotificationSetting = 'unsupported' | 'off' | 'on' | 'blocked';

export interface AlertsSnapshot {
  state: AlertsState;
  alerts: CheckedAlert[];
}

interface AlertsContextValue {
  /** New issues across all alerts; 0 while unknown. */
  newTotal: number;
  snapshot: AlertsSnapshot | null;
  /** Checks again now; resolves with the fresh snapshot. */
  refresh: () => Promise<AlertsSnapshot | null>;
  notifications: NotificationSetting;
  setNotifications: (on: boolean) => Promise<NotificationSetting>;
}

const AlertsContext = createContext<AlertsContextValue | null>(null);

function readSetting(): NotificationSetting {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  try {
    return Notification.permission === 'granted' && localStorage.getItem(NOTIFY_KEY) === 'on' ? 'on' : 'off';
  } catch {
    return 'off';
  }
}

export function AlertsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<AlertsSnapshot | null>(null);
  const [notifications, setNotificationState] = useState<NotificationSetting>('off');
  const lastCheck = useRef(0);
  const latest = useRef(0);
  // Counts already reported in this session, by alert, so a notification is only for something newer.
  const reported = useRef<Map<string, { seen: string; count: number }> | null>(null);

  const notifyIncreases = useCallback((alerts: CheckedAlert[]) => {
    const previous = reported.current;
    const next = new Map<string, { seen: string; count: number }>();
    for (const alert of alerts) next.set(alert.id, { seen: alert.last_seen_at, count: alert.newCount ?? 0 });
    reported.current = next;
    if (!previous || readSetting() !== 'on') return;
    for (const alert of alerts) {
      const before = previous.get(alert.id);
      const baseline = before && before.seen === alert.last_seen_at ? before.count : 0;
      const count = alert.newCount ?? 0;
      if (count <= baseline) continue;
      const fresh = count - baseline;
      const notice = new Notification(alert.name, {
        body: `${fresh} new ${fresh === 1 ? 'issue' : 'issues'}${alert.latest[0] ? `: ${alert.latest[0].title}` : ''}`,
        tag: `orion-alert-${alert.id}`,
        icon: '/icon.svg',
      });
      notice.onclick = () => {
        window.focus();
        router.push('/alerts');
      };
    }
  }, [router]);

  const refresh = useCallback(async () => {
    lastCheck.current = Date.now();
    const id = ++latest.current;
    try {
      const response = await fetch('/api/alerts', { cache: 'no-store' });
      if (!response.ok && response.status !== 401) return null;
      const next = (await response.json()) as AlertsSnapshot;
      // A slower, older check must not overwrite a newer one.
      if (id !== latest.current) return next;
      setSnapshot(next);
      if (next.state === 'ready') notifyIncreases(next.alerts);
      return next;
    } catch {
      return null;
    }
  }, [notifyIncreases]);

  useEffect(() => {
    // Reads browser-only state once mounted, so server and first client render agree.
    const id = window.setTimeout(() => setNotificationState(readSetting()), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!user) {
      reported.current = null;
      return;
    }
    const first = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastCheck.current > STALE_MS) void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, refresh]);

  const setNotifications = useCallback(async (on: boolean) => {
    if (!('Notification' in window)) return 'unsupported' as const;
    if (on && Notification.permission === 'default') await Notification.requestPermission();
    try {
      localStorage.setItem(NOTIFY_KEY, on && Notification.permission === 'granted' ? 'on' : 'off');
    } catch {
      // Private windows can refuse storage; the setting then lasts for this page only.
    }
    const setting = readSetting();
    setNotificationState(setting);
    return setting;
  }, []);

  const value = useMemo<AlertsContextValue>(() => {
    const live = user && snapshot?.state === 'ready' ? snapshot : null;
    return {
      newTotal: live ? live.alerts.reduce((sum, alert) => sum + (alert.newCount ?? 0), 0) : 0,
      snapshot: user ? snapshot : null,
      refresh,
      notifications,
      setNotifications,
    };
  }, [user, snapshot, refresh, notifications, setNotifications]);

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts() {
  const value = useContext(AlertsContext);
  if (!value) throw new Error('useAlerts must be used within an AlertsProvider');
  return value;
}
