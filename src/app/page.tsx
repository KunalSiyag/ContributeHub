import { getTrendingRepositories, getBeginnerIssues, searchIssues, getGlobalStats } from '@/lib/github';
import { scrapeTrendingDevelopers } from '@/lib/GitHubScraper';
import { getActiveOrUpcomingEvents } from '@/lib/events';
import { Repository, Issue } from '@/types';
import HomeClient from '@/components/HomeClient';

// Types for real data
interface PlatformStats {
  totalUsers: number;
  totalIssues: number;
  totalPRs: number;
  totalBounties: number;
}

interface Contributor {
  id: string;
  username: string;
  avatar_url: string;
  contribution_count: number;
}

async function getStats(): Promise<PlatformStats> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/stats`, { next: { revalidate: 0 } });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  } catch {
    return { totalUsers: 0, totalIssues: 0, totalPRs: 0, totalBounties: 0 };
  }
}

async function getActiveContributors(): Promise<Contributor[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/contributors`, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error('Failed to fetch contributors');
    const data = await res.json();
    return data.contributors || [];
  } catch {
    return [];
  }
}

async function getBountyIssues(): Promise<Issue[]> {
  try {
    // Search for issues with bounty-related labels
    const response = await searchIssues({
      labels: ['bounty'],
      state: 'open',
      sort: 'created',
      order: 'desc',
      perPage: 6,
    });
    return response.items || [];
  } catch {
    return [];
  }
}

export default async function Home() {
  // Fetch all data in parallel
    const [reposResponse, issuesResponse, stats, trendingDevelopers, bountyIssues] = await Promise.all([
    getTrendingRepositories().catch(() => ({ items: [] })),
    getBeginnerIssues().catch(() => ({ items: [] })),
    getStats(), // Local stats for Waitlist
    scrapeTrendingDevelopers().catch(() => []), // Real Scraped Trending Developers
    getBountyIssues(),
  ]);

  const trendingRepos: Repository[] = reposResponse.items || [];
  const beginnerIssues: Issue[] = issuesResponse.items || [];
  const events = getActiveOrUpcomingEvents();

  return (
    <HomeClient 
      trendingRepos={trendingRepos} 
      beginnerIssues={beginnerIssues}
      events={events}
      stats={stats}
      activeContributors={trendingDevelopers}
      bountyIssues={bountyIssues}
    />
  );
}
