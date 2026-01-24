import { createClient } from '@/lib/supabase/client';
import { useState, useEffect, useCallback } from 'react';

export interface ActiveContributor {
  user_id: string;
  username: string;
  avatar_url: string;
  action_count: number;
  last_active: string;
}

export function useActiveContributors(limit: number = 10) {
  const [contributors, setContributors] = useState<ActiveContributor[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchContributors = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_active_contributors', { limit_count: limit } as any);

      if (error) {
        console.error('Error fetching active contributors:', error);
        return;
      }

      setContributors(data || []);
    } catch (err) {
      console.error('Failed to fetch contributors:', err);
    } finally {
      setLoading(false);
    }
  }, [limit, supabase]);

  useEffect(() => {
    fetchContributors();
  }, [fetchContributors]);

  return { contributors, loading, refetch: fetchContributors };
}

// Server-side function for initial data
export async function getActiveContributorsServer(limit: number = 10): Promise<ActiveContributor[]> {
  // For SSR, we'll use a simple query since RPC might not be available
  // This returns mock data when the function doesn't exist yet
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_active_contributors?limit_count=${limit}`,
      {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      // Return empty array if function doesn't exist
      return [];
    }

    return await response.json();
  } catch {
    return [];
  }
}
