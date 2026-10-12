'use client';

import { useSyncExternalStore } from 'react';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/config';

export type OAuthProvider = 'github' | 'google';

export const PROVIDER_LABEL: Record<OAuthProvider, string> = { github: 'GitHub', google: 'Google' };

const ORDER: OAuthProvider[] = ['github', 'google'];
const FALLBACK: OAuthProvider[] = ['github'];

/** Providers switched on in Supabase Auth, from its public `/auth/v1/settings` response. */
export function enabledProviders(settings: unknown): OAuthProvider[] {
  const external = (settings as { external?: Record<string, unknown> } | null)?.external;
  const enabled = external ? ORDER.filter(provider => external[provider] === true) : [];
  return enabled.length > 0 ? enabled : FALLBACK;
}

let current = FALLBACK;
let requested = false;
const listeners = new Set<() => void>();

function load() {
  if (requested || !isSupabaseConfigured()) return;
  requested = true;
  fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY } })
    .then(response => (response.ok ? response.json() : null))
    .then(settings => {
      const next = enabledProviders(settings);
      if (next.join() === current.join()) return;
      current = next;
      listeners.forEach(listener => listener());
    })
    .catch(() => {
      // Keep GitHub: it is always configured for Orion.
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  load();
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Sign-in providers to offer. Starts with GitHub and adds Google once
 * Supabase reports it enabled, so the UI never offers a provider that
 * would fail.
 */
export function useAuthProviders(): OAuthProvider[] {
  return useSyncExternalStore(subscribe, () => current, () => FALLBACK);
}
