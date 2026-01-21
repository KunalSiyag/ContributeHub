import { getTrendingRepositories, getBeginnerIssues } from '@/lib/github';
import { getActiveOrUpcomingEvents } from '@/lib/events';
import { Repository, Issue } from '@/types';
import HomeClient from '@/components/HomeClient';

export default async function Home() {
  // Fetch data on the server
  let trendingRepos: Repository[] = [];
  let beginnerIssues: Issue[] = [];

  try {
    const [reposResponse, issuesResponse] = await Promise.all([
      getTrendingRepositories(),
      getBeginnerIssues(),
    ]);
    trendingRepos = reposResponse.items || [];
    beginnerIssues = issuesResponse.items || [];
  } catch (error) {
    console.error('Failed to fetch data:', error);
  }

  // Get active or upcoming events
  const events = getActiveOrUpcomingEvents();

  // Pass data to Client Component for rendering & animation
  return (
    <HomeClient 
      trendingRepos={trendingRepos} 
      beginnerIssues={beginnerIssues}
      events={events}
    />
  );
}

