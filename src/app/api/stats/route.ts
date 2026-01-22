import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a server-side Supabase client with service role for public stats
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Get counts from Supabase
    const [profilesResult, issuesResult, prsResult] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('tracked_issues').select('id', { count: 'exact', head: true }),
      supabase.from('tracked_prs').select('id', { count: 'exact', head: true }),
    ]);

    // Calculate bounty stats
    const bountyResult = await supabase
      .from('tracked_issues')
      .select('bounty_amount')
      .eq('has_bounty', true);

    let totalBounties = 0;
    if (bountyResult.data) {
      bountyResult.data.forEach(issue => {
        if (issue.bounty_amount) {
          // Parse bounty amounts like "$100", "100", "$1,000"
          const amount = parseFloat(issue.bounty_amount.replace(/[$,]/g, ''));
          if (!isNaN(amount)) {
            totalBounties += amount;
          }
        }
      });
    }

    const stats = {
      totalUsers: profilesResult.count || 0,
      totalIssues: issuesResult.count || 0,
      totalPRs: prsResult.count || 0,
      totalBounties: totalBounties,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    // Return zeros on error instead of failing
    return NextResponse.json({
      totalUsers: 0,
      totalIssues: 0,
      totalPRs: 0,
      totalBounties: 0,
    });
  }
}
