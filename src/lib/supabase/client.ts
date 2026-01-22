import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Custom cookie storage adapter for PKCE
// This stores the code_verifier in cookies so it persists across OAuth redirects
const cookieStorage = {
  getItem: (key: string): string | null => {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === key) {
        const decoded = decodeURIComponent(value);
        console.log(`[CookieStorage] getItem('${key}'): found`);
        return decoded;
      }
    }
    console.log(`[CookieStorage] getItem('${key}'): null`);
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof document === 'undefined') return;
    // Set cookie with 1 hour expiry for PKCE verifier
    const expires = new Date(Date.now() + 60 * 60 * 1000).toUTCString();
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; expires=${expires}; SameSite=Lax`;
    console.log(`[CookieStorage] setItem('${key}'): set with 1h expiry`);
  },
  removeItem: (key: string): void => {
    if (typeof document === 'undefined') return;
    document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    console.log(`[CookieStorage] removeItem('${key}')`);
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseClient: any = null;

export function createClient() {
  if (typeof window === 'undefined') {
    // Return a new client for server-side
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  
  if (supabaseClient) return supabaseClient;
  
  supabaseClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        storage: cookieStorage,
        storageKey: 'supabase-auth',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );
  
  return supabaseClient;
}

