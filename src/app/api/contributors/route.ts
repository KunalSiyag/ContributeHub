import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface ActiveContributor {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  action_count: number;
  last_active: string;
}

export async function GET() {
  try {
    // Try to use the stored function first
    const { data: funcData, error: funcError } = await supabase.rpc(
      'get_active_contributors',
      { limit_count: 10 }
    );

    if (!funcError && funcData && funcData.length > 0) {
      // Map to consistent format
      const contributors = funcData.map((c: ActiveContributor) => ({
        id: c.user_id,
        username: c.username || 'Anonymous',
        avatar_url: c.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${c.username}`,
        contribution_count: c.action_count,
        last_active: c.last_active,
      }));
      return NextResponse.json({ contributors });
    }

    // Fallback: Query directly from user_activity and profiles
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: activityData, error: activityError } = await supabase
      .from('user_activity')
      .select(`
        user_id,
        profiles!inner(github_username, avatar_url)
      `)
      .gte('created_at', sevenDaysAgo.toISOString())
      .limit(50);

    if (activityError) {
      console.error('Error fetching activity:', activityError);
      return NextResponse.json({ contributors: [] });
    }

    // Aggregate by user
    const userMap = new Map<string, { username: string; avatar: string; count: number }>();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activityData?.forEach((activity: any) => {
      const userId = activity.user_id;
      // Supabase joins return profiles as array or object depending on relationship
      const profile = Array.isArray(activity.profiles) 
        ? activity.profiles[0] 
        : activity.profiles;
      
      if (userMap.has(userId)) {
        userMap.get(userId)!.count++;
      } else {
        userMap.set(userId, {
          username: profile?.github_username || 'Anonymous',
          avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${userId}`,
          count: 1,
        });
      }
    });

    // Sort by count and take top 10
    const contributors = Array.from(userMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([id, data]) => ({
        id,
        username: data.username,
        avatar_url: data.avatar,
        contribution_count: data.count,
      }));

    return NextResponse.json({ contributors });
  } catch (error) {
    console.error('Error fetching contributors:', error);
    return NextResponse.json({ contributors: [] });
  }
}
