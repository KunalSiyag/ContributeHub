import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';

export { isSupabaseConfigured };

export type BrowserSupabase = ReturnType<typeof createBrowserClient<Database>>;

/**
 * Browser client. Sessions (and the PKCE code verifier used by the GitHub
 * OAuth redirect) live in cookies so the server can read them in
 * /auth/callback and in route handlers. @supabase/ssr returns a singleton.
 */
export function createClient(): BrowserSupabase {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
