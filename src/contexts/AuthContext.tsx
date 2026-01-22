'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);
  
  // Create supabase client once
  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle to avoid 406 when profile doesn't exist
      
      if (error) {
        console.log('Profile fetch error:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  };

  useEffect(() => {
    // Prevent double initialization in strict mode
    if (initialized.current) return;
    initialized.current = true;

    let mounted = true;

    const getInitialSession = async () => {
      try {
        // Use getSession instead of getUser for faster initial load
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.log('Session check:', error.message);
        }
        
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          const userProfile = await fetchProfile(currentUser.id);
          if (mounted) setProfile(userProfile);
        }
      } catch (err) {
        if (mounted) console.error('Auth init error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth event:', event);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          const userProfile = await fetchProfile(currentUser.id);
          if (mounted) setProfile(userProfile);
        } else {
          setProfile(null);
        }
        
        // Ensure loading is false after auth change
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithGitHub = async () => {
    try {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(currentPath)}`;
      
      console.log('Starting GitHub OAuth...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo },
      });
      
      if (error) {
        console.error('OAuth error:', error.message);
        alert(`Login failed: ${error.message}`);
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Sign in failed:', err);
      alert(`Login error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    signInWithGitHub,
    signOut,
  }), [user, profile, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
