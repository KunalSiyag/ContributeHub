// Gamified Badge System for Repositories and Issues

export type BadgeType = 
  | 'hot'           // 🔥 >500 stars in 7 days
  | 'rising'        // 🚀 >100 stars in 7 days
  | 'beginner'      // 👶 Has good first issue labels
  | 'fast-response' // ⚡ Fast maintainer response
  | 'hiring'        // 💼 Org is hiring
  | 'trending'      // 📈 High velocity
  | 'popular'       // ⭐ >10k stars
  | 'active'        // 🟢 Updated recently
  | 'bounty';       // 💰 Has bounty

export interface Badge {
  type: BadgeType;
  label: string;
  emoji: string;
  color: string;
  priority: number; // Higher = shown first
}

export const BADGE_DEFINITIONS: Record<BadgeType, Omit<Badge, 'type'>> = {
  hot: {
    label: 'Hot',
    emoji: '🔥',
    color: '#ef4444',
    priority: 100,
  },
  rising: {
    label: 'Rising',
    emoji: '🚀',
    color: '#f97316',
    priority: 90,
  },
  trending: {
    label: 'Trending',
    emoji: '📈',
    color: '#8b5cf6',
    priority: 85,
  },
  beginner: {
    label: 'Beginner Friendly',
    emoji: '👶',
    color: '#22c55e',
    priority: 80,
  },
  bounty: {
    label: 'Bounty',
    emoji: '💰',
    color: '#eab308',
    priority: 75,
  },
  hiring: {
    label: 'Hiring',
    emoji: '💼',
    color: '#3b82f6',
    priority: 70,
  },
  'fast-response': {
    label: 'Fast Response',
    emoji: '⚡',
    color: '#06b6d4',
    priority: 60,
  },
  popular: {
    label: 'Popular',
    emoji: '⭐',
    color: '#f59e0b',
    priority: 50,
  },
  active: {
    label: 'Active',
    emoji: '🟢',
    color: '#10b981',
    priority: 40,
  },
};

// Calculate badges for a repository
export function calculateRepoBadges(repo: {
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  topics?: string[];
  description?: string | null;
}): Badge[] {
  const badges: Badge[] = [];
  const now = new Date();
  const updatedAt = new Date(repo.updated_at);
  const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
  
  // Popular: >10k stars
  if (repo.stargazers_count >= 10000) {
    badges.push({ type: 'popular', ...BADGE_DEFINITIONS.popular });
  }
  
  // Trending: High star count and recent activity
  if (repo.stargazers_count >= 1000 && daysSinceUpdate <= 7) {
    badges.push({ type: 'trending', ...BADGE_DEFINITIONS.trending });
  }
  
  // Hot: Very popular and very active
  if (repo.stargazers_count >= 5000 && daysSinceUpdate <= 3) {
    badges.push({ type: 'hot', ...BADGE_DEFINITIONS.hot });
  }
  
  // Rising: Good stars and recent updates
  if (repo.stargazers_count >= 500 && repo.stargazers_count < 5000 && daysSinceUpdate <= 14) {
    badges.push({ type: 'rising', ...BADGE_DEFINITIONS.rising });
  }
  
  // Active: Updated within last 7 days
  if (daysSinceUpdate <= 7) {
    badges.push({ type: 'active', ...BADGE_DEFINITIONS.active });
  }
  
  // Beginner friendly: Has beginner topics
  const beginnerTopics = ['beginner-friendly', 'good-first-issue', 'hacktoberfest', 'first-timers-only'];
  if (repo.topics?.some(t => beginnerTopics.includes(t.toLowerCase()))) {
    badges.push({ type: 'beginner', ...BADGE_DEFINITIONS.beginner });
  }
  
  // Hiring: Has hiring in description or topics
  const hiringKeywords = ['hiring', 'careers', 'jobs', 'we-are-hiring'];
  if (
    repo.description?.toLowerCase().includes('hiring') ||
    repo.topics?.some(t => hiringKeywords.includes(t.toLowerCase()))
  ) {
    badges.push({ type: 'hiring', ...BADGE_DEFINITIONS.hiring });
  }
  
  // Sort by priority and return top 3
  return badges
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);
}

// Calculate badges for an issue
export function calculateIssueBadges(issue: {
  labels: Array<{ name: string; color?: string }>;
  created_at: string;
  comments: number;
  reactions?: { total_count: number };
}): Badge[] {
  const badges: Badge[] = [];
  const labelNames = issue.labels.map(l => l.name.toLowerCase());
  
  // Beginner friendly
  const beginnerLabels = ['good first issue', 'beginner', 'easy', 'first-timers-only', 'starter', 'good-first-issue'];
  if (labelNames.some(l => beginnerLabels.some(bl => l.includes(bl)))) {
    badges.push({ type: 'beginner', ...BADGE_DEFINITIONS.beginner });
  }
  
  // Bounty
  const bountyLabels = ['bounty', 'reward', '💰', 'paid'];
  if (labelNames.some(l => bountyLabels.some(bl => l.includes(bl)))) {
    badges.push({ type: 'bounty', ...BADGE_DEFINITIONS.bounty });
  }
  
  // Hot: Many reactions
  if (issue.reactions && issue.reactions.total_count >= 10) {
    badges.push({ type: 'hot', ...BADGE_DEFINITIONS.hot });
  }
  
  // Active discussion
  if (issue.comments >= 5) {
    badges.push({ type: 'active', ...BADGE_DEFINITIONS.active });
  }
  
  return badges
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);
}

// Get badge by type
export function getBadge(type: BadgeType): Badge {
  return { type, ...BADGE_DEFINITIONS[type] };
}
