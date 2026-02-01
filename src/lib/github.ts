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

  const data = await response.json();
  
  // Filter out pull requests - GitHub's search API can return PRs even with is:issue
  // PRs have a 'pull_request' key in the response object
  const filteredItems = data.items?.filter((item: any) => !item.pull_request) || [];
  
  return {
    ...data,
    items: filteredItems,
    total_count: filteredItems.length,
  };
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

// Calculate match score for an issue based on resume analysis
export interface IssueMatchResult {
  score: number;
  matchReasons: string[];
}

export interface ResumeSkills {
  skills: string[];
  technologies: string[];
  interests: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
}

export function calculateIssueMatchScore(
  issue: Issue,
  resumeSkills: ResumeSkills,
  repoLanguage?: string | null
): IssueMatchResult {
  let score = 0;
  const matchReasons: string[] = [];
  const labels = issue.labels.map(l => l.name.toLowerCase());
  
  // 1. Language match (30 points)
  if (repoLanguage && resumeSkills.skills.some(
    skill => skill.toLowerCase() === repoLanguage.toLowerCase()
  )) {
    score += 30;
    matchReasons.push(`Matches your ${repoLanguage} skills`);
  }
  
  // 2. Experience level match (25 points)
  const beginnerLabels = ['good first issue', 'beginner', 'easy', 'first-timers-only', 'starter'];
  const intermediateLabels = ['help wanted', 'medium', 'intermediate'];
  const advancedLabels = ['advanced', 'complex', 'expert'];
  
  const hasBeginnerLabel = labels.some(l => beginnerLabels.some(bl => l.includes(bl)));
  const hasIntermediateLabel = labels.some(l => intermediateLabels.some(il => l.includes(il)));
  const hasAdvancedLabel = labels.some(l => advancedLabels.some(al => l.includes(al)));
  
  if (resumeSkills.experienceLevel === 'beginner' && hasBeginnerLabel) {
    score += 25;
    matchReasons.push('Perfect for beginners');
  } else if (resumeSkills.experienceLevel === 'intermediate' && (hasIntermediateLabel || hasBeginnerLabel)) {
    score += 20;
    matchReasons.push('Matches your experience level');
  } else if (resumeSkills.experienceLevel === 'advanced') {
    score += 15; // Advanced users can handle anything
    if (hasAdvancedLabel) {
      score += 10;
      matchReasons.push('Challenging issue for senior devs');
    }
  }
  
  // 3. Technology in labels/title (25 points)
  const issueText = (issue.title + ' ' + labels.join(' ')).toLowerCase();
  const techMatches = resumeSkills.technologies.filter(tech => 
    issueText.includes(tech.toLowerCase())
  );
  if (techMatches.length > 0) {
    score += Math.min(techMatches.length * 10, 25);
    matchReasons.push(`Uses ${techMatches.slice(0, 2).join(', ')}`);
  }
  
  // 4. Interest area match (20 points)
  const interestKeywords: Record<string, string[]> = {
    'web': ['frontend', 'ui', 'css', 'html', 'website'],
    'backend': ['api', 'server', 'database', 'backend'],
    'mobile': ['android', 'ios', 'mobile', 'react-native', 'flutter'],
    'devops': ['docker', 'ci', 'cd', 'deploy', 'kubernetes', 'infra'],
    'machine-learning': ['ml', 'ai', 'model', 'training', 'prediction'],
    'documentation': ['docs', 'documentation', 'readme', 'guide'],
    'testing': ['test', 'testing', 'coverage', 'e2e', 'unit'],
  };
  
  for (const interest of resumeSkills.interests) {
    const keywords = interestKeywords[interest] || [interest];
    if (keywords.some(kw => issueText.includes(kw))) {
      score += 20;
      matchReasons.push(`Related to your interest in ${interest}`);
      break;
    }
  }
  
  return {
    score: Math.min(score, 100),
    matchReasons: matchReasons.slice(0, 3), // Max 3 reasons
  };
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

// Get trending developers (users with high followers)
export async function getTrendingDevelopers(limit: number = 6): Promise<any[]> {
  try {
    const url = `${GITHUB_API_BASE}/search/users?q=type:user+followers:>500&sort=followers&order=desc&per_page=${limit}`;
    const response = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 3600 },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.items || [];
  } catch {
    return [];
  }
}
