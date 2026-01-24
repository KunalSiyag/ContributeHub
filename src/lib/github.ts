import {
  Repository,
  Issue,
  SearchResponse,
  RepositoryFilters,
  IssueFilters,
  CONTRIBUTION_LABELS,
} from '@/types';

const GITHUB_API_BASE = 'https://api.github.com';

// Get headers for GitHub API requests
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // Add token if available (for higher rate limits)
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

// Search repositories with filters
export async function searchRepositories(
  filters: RepositoryFilters
): Promise<SearchResponse<Repository>> {
  const {
    query = '',
    language,
    minStars = 0,
    topics = [],
    sort = 'stars',
    order = 'desc',
    page = 1,
    perPage = 20,
  } = filters;

  // Build the search query
  const queryParts: string[] = [];

  if (query) {
    queryParts.push(query);
  }

  if (language) {
    queryParts.push(`language:${language}`);
  }

  if (minStars > 0) {
    queryParts.push(`stars:>=${minStars}`);
  }

  topics.forEach((topic) => {
    queryParts.push(`topic:${topic}`);
  });

  // Default: look for repos with help wanted issues
  if (queryParts.length === 0) {
    queryParts.push('help-wanted-issues:>0');
  }

  const searchQuery = encodeURIComponent(queryParts.join(' '));
  const url = `${GITHUB_API_BASE}/search/repositories?q=${searchQuery}&sort=${sort}&order=${order}&page=${page}&per_page=${perPage}`;

  const response = await fetch(url, {
    headers: getHeaders(),
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Search issues with contribution-friendly labels
export async function searchIssues(
  filters: IssueFilters
): Promise<SearchResponse<Issue>> {
  const {
    labels = ['good first issue'],
    language,
    state = 'open',
    sort = 'created',
    order = 'desc',
    page = 1,
    perPage = 20,
  } = filters;

  // Build the search query
  const queryParts: string[] = ['is:issue', `state:${state}`];

  // Add labels
  labels.forEach((label) => {
    queryParts.push(`label:"${label}"`);
  });

  if (language) {
    queryParts.push(`language:${language}`);
  }

  const searchQuery = encodeURIComponent(queryParts.join(' '));
  const url = `${GITHUB_API_BASE}/search/issues?q=${searchQuery}&sort=${sort}&order=${order}&page=${page}&per_page=${perPage}`;

  const response = await fetch(url, {
    headers: getHeaders(),
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Get a single repository by owner and name
export async function getRepository(
  owner: string,
  repo: string
): Promise<Repository> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;

  const response = await fetch(url, {
    headers: getHeaders(),
    next: { revalidate: 600 }, // Cache for 10 minutes
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Get trending repositories (recently active with good engagement)
export async function getTrendingRepositories(
  language?: string,
  days: number = 7
): Promise<SearchResponse<Repository>> {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const dateStr = date.toISOString().split('T')[0];

  const queryParts = [
    `pushed:>=${dateStr}`,
    'stars:>=100',
    'help-wanted-issues:>0',
  ];

  if (language) {
    queryParts.push(`language:${language}`);
  }

  const searchQuery = encodeURIComponent(queryParts.join(' '));
  const url = `${GITHUB_API_BASE}/search/repositories?q=${searchQuery}&sort=stars&order=desc&per_page=12`;

  const response = await fetch(url, {
    headers: getHeaders(),
    next: { revalidate: 600 },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Get beginner-friendly issues
export async function getBeginnerIssues(
  language?: string
): Promise<SearchResponse<Issue>> {
  return searchIssues({
    labels: ['good first issue'],
    language,
    state: 'open',
    sort: 'created',
    order: 'desc',
    perPage: 20,
  });
}

// Get help wanted issues
export async function getHelpWantedIssues(
  language?: string
): Promise<SearchResponse<Issue>> {
  return searchIssues({
    labels: ['help wanted'],
    language,
    state: 'open',
    sort: 'created',
    order: 'desc',
    perPage: 20,
  });
}

// Calculate match score between a repository and user preferences
export function calculateMatchScore(
  repo: Repository,
  userSkills: string[],
  userInterests: string[]
): number {
  let score = 0;
  const maxScore = 100;

  // Language match (30 points)
  if (repo.language && userSkills.some(
    skill => skill.toLowerCase() === repo.language?.toLowerCase()
  )) {
    score += 30;
  }

  // Topic matches (up to 40 points)
  const topicMatches = repo.topics.filter(topic =>
    userInterests.some(interest =>
      topic.toLowerCase().includes(interest.toLowerCase()) ||
      interest.toLowerCase().includes(topic.toLowerCase())
    )
  );
  score += Math.min(topicMatches.length * 10, 40);

  // Activity score (up to 20 points)
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceUpdate < 7) score += 20;
  else if (daysSinceUpdate < 30) score += 15;
  else if (daysSinceUpdate < 90) score += 10;
  else if (daysSinceUpdate < 180) score += 5;

  // Open issues bonus (10 points if has contribution opportunities)
  if (repo.open_issues_count > 0) score += 10;

  return Math.min(score, maxScore);
}

// Fetch global GitHub stats (Real-time)
export async function getGlobalStats() {
  try {
    const [issuesRes, prsRes, usersRes] = await Promise.all([
      // Issues
      fetch(`${GITHUB_API_BASE}/search/issues?q=is:issue+is:open&per_page=1`, {
        headers: getHeaders(),
        next: { revalidate: 3600 } // Cache for 1 hour
      }),
      // PRs
      fetch(`${GITHUB_API_BASE}/search/issues?q=is:pr+is:open&per_page=1`, {
        headers: getHeaders(),
        next: { revalidate: 3600 }
      }),
       // Users - explicit type:user search
      fetch(`${GITHUB_API_BASE}/search/users?q=type:user&per_page=1`, {
        headers: getHeaders(),
        next: { revalidate: 3600 }
      })
    ]);

    const issuesData = await issuesRes.json();
    const prsData = await prsRes.json();
    const usersData = await usersRes.json();

    return {
      totalIssues: issuesData.total_count || 0,
      totalPRs: prsData.total_count || 0,
      totalUsers: usersData.total_count || 0,
      totalBounties: 500000 // Still estimated/hardcoded as there's no single API for this
    };
  } catch (error) {
    console.error('Error fetching global stats:', error);
    // Fallback to average known numbers if API fails
    return {
      totalIssues: 20000000,
      totalPRs: 5000000,
      totalUsers: 100000000,
      totalBounties: 500000
    };
  }
}
