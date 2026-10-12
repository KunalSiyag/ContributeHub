'use client';

import { useSyncExternalStore } from 'react';

const subscribers = new Map<number, Set<() => void>>();
const timers = new Map<number, ReturnType<typeof setInterval>>();

function subscribe(interval: number) {
  return (callback: () => void) => {
    let set = subscribers.get(interval);
    if (!set) {
      set = new Set();
      subscribers.set(interval, set);
      timers.set(
        interval,
        setInterval(() => subscribers.get(interval)?.forEach(cb => cb()), interval)
      );
    }
    set.add(callback);
    return () => {
      set!.delete(callback);
      if (set!.size === 0) {
        clearInterval(timers.get(interval));
        timers.delete(interval);
        subscribers.delete(interval);
      }
    };
  };
}

const subscribeCache = new Map<number, ReturnType<typeof subscribe>>();

/**
 * Current time, bucketed to `interval` ms so components re-render on that
 * cadence. Returns null during SSR and hydration, so time-relative text
 * never causes a hydration mismatch.
 */
export function useNow(interval = 30_000): number | null {
  let sub = subscribeCache.get(interval);
  if (!sub) {
    sub = subscribe(interval);
    subscribeCache.set(interval, sub);
  }
  const bucket = useSyncExternalStore(
    sub,
    () => Math.floor(Date.now() / interval),
    () => null
  );
  // Start of the current bucket: stable for the whole render, pure.
  return bucket === null ? null : bucket * interval;
}
