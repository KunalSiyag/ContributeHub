import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Singleton pattern - reuse the same client
let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (supabaseClient) return supabaseClient;
  
  // Use standard client-side Supabase client (no SSR/cookies for now to fix issues)
  supabaseClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return supabaseClient;
}
