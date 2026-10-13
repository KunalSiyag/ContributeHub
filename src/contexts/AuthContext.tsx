'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { githubLoginOf, profileSeed } from '@/lib/identity';
import { PROVIDER_LABEL, type OAuthProvider } from '@/hooks/useAuthProviders';
import { useToast } from '@/components/ui/Toast';
import type { Database, Profile } from '@/types/database';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  /** GitHub login from the profile or a GitHub sign-in; null for Google-only accounts without one. */
  githubLogin: string | null;
  /** True until the initial session check finishes. */
  loading: boolean;
  /** True once the signed-in user's profile row has been loaded (or there is no user). */
  profileReady: boolean;
  /** False when Supabase env vars are missing; sign-in is unavailable. */
  configured: boolean;
  /** Starts the OAuth redirect; resolves false when it couldn't start. */
  signIn: (provider: OAuthProvider, next?: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: ProfileUpdate) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Token refreshes emit a new User object for the same account; keep the old one. */
function sameUser(prev: User | null, next: User | null) {
  return prev === next || (!!prev && !!next && prev.id === next.id && prev.updated_at === next.updated_at);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);
  // Profile is stored with the user id it belongs to, so a stale profile is
  // never shown for a different (or signed-out) user.
  const [profileState, setProfileState] = useState<{ userId: string; profile: Profile | null } | null>(null);

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const next = data.session?.user ?? null;
      setUser(prev => (sameUser(prev, next) ? prev : next));
      setLoading(false);
    });

    // Keep this callback synchronous: awaiting Supabase calls inside it can
    // deadlock the auth lock. Profile loading happens in the effect below.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const next = session?.user ?? null;
      setUser(prev => (sameUser(prev, next) ? prev : next));
      setLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [configured]);

  const loadProfile = useCallback(async (current: User) => {
    const supabase = createClient();
    const { data, error } = await supabase.from('profiles').select('*').eq('id', current.id).maybeSingle();

    if (error) {
      setProfileState({ userId: current.id, profile: null });
      return;
    }

    if (data) {
      // A GitHub identity linked after signup (same email) leaves the column empty; fill it once.
      const login = githubLoginOf(current);
      if (!data.github_username && login) {
        const { data: synced } = await supabase
          .from('profiles')
          .update({ github_username: login })
          .eq('id', current.id)
          .select('*')
          .maybeSingle();
        setProfileState({ userId: current.id, profile: synced ?? data });
        return;
      }
      setProfileState({ userId: current.id, profile: data });
      return;
    }

    // The signup trigger can miss users created before it existed. Tracked
    // issues reference profiles(id), so create the row now.
    const { data: created } = await supabase.from('profiles').upsert(profileSeed(current)).select('*').maybeSingle();
    setProfileState({ userId: current.id, profile: created ?? null });
  }, []);

  const userRef = useRef<User | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const userId = user?.id ?? null;
  useEffect(() => {
    const current = userRef.current;
    if (!userId || !current) return;
    loadProfile(current).catch(() => setProfileState({ userId, profile: null }));
  }, [userId, loadProfile]);

  const profile = user && profileState?.userId === user.id ? profileState.profile : null;
  const profileReady = !loading && (!user || profileState?.userId === user.id);

  const signIn = useCallback(
    async (provider: OAuthProvider, next?: string) => {
      if (!configured) {
        toast('Sign-in is not configured for this deployment.', { tone: 'error' });
        return false;
      }
      const destination = next ?? `${window.location.pathname}${window.location.search}`;
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        destination === '/' ? '/dashboard' : destination
      )}`;
      const { error } = await createClient().auth.signInWithOAuth({
        provider,
        // Let people with several Google accounts pick one instead of reusing the last.
        options: { redirectTo, queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined },
      });
      if (error) toast(`Couldn't start ${PROVIDER_LABEL[provider]} sign-in: ${error.message}`, { tone: 'error' });
      return !error;
    },
    [configured, toast]
  );

  const signOut = useCallback(async () => {
    if (!configured) return;
    const { error } = await createClient().auth.signOut();
    if (error) {
      toast(`Couldn't sign out: ${error.message}`, { tone: 'error' });
      return;
    }
    setUser(null);
    toast('Signed out');
  }, [configured, toast]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user);
  }, [user, loadProfile]);

  const updateProfile = useCallback(
    async (patch: ProfileUpdate) => {
      if (!user) return { error: 'Sign in to save your profile.' };
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ ...profileSeed(user), ...profile, ...patch, id: user.id })
        .select('*')
        .maybeSingle();
      if (error) return { error: error.message };
      setProfileState({ userId: user.id, profile: data ?? null });
      return { error: null };
    },
    [user, profile]
  );

  const githubLogin = profile?.github_username || githubLoginOf(user);

  const value = useMemo<AuthContextType>(
    () => ({ user, profile, githubLogin, loading, profileReady, configured, signIn, signOut, refreshProfile, updateProfile }),
    [user, profile, githubLogin, loading, profileReady, configured, signIn, signOut, refreshProfile, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
