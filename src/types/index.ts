// GitHub Repository interface
export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  license: {
    name: string;
    spdx_id: string;
  } | null;
}

// GitHub Issue interface
export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: 'open' | 'closed';
  labels: Label[];
  comments: number;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  repository_url: string;
  repository?: {
    name: string;
    full_name: string;
    html_url: string;
  };
}

// GitHub Label interface
export interface Label {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

// User preferences stored in localStorage
export interface UserPreferences {
  skills: string[];
  interests: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  minStars: number;
  preferredLanguages: string[];
  theme: 'light' | 'dark' | 'system';
}

// Search filters for repositories
export interface RepositoryFilters {
  query?: string;
  language?: string;
  minStars?: number;
  maxStars?: number;
  topics?: string[];
  sort?: 'stars' | 'forks' | 'updated' | 'help-wanted-issues';
  order?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
}

// Search filters for issues
export interface IssueFilters {
  labels?: string[];
  language?: string;
  state?: 'open' | 'closed' | 'all';
  sort?: 'created' | 'updated' | 'comments';
  order?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
}

// API response wrapper
export interface ApiResponse<T> {
  data: T;
  total_count: number;
  incomplete_results: boolean;
}

// GitHub Search API response
export interface SearchResponse<T> {
  total_count: number;
  incomplete_results: boolean;
  items: T[];
}

// Popular programming languages
export const POPULAR_LANGUAGES = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Go',
  'Rust',
  'Java',
  'Ruby',
  'PHP',
  'C++',
  'C',
  'C#',
  'Swift',
  'Kotlin',
  'Vue',
  'HTML',
  'CSS',
] as const;

// Issue labels we care about
export const CONTRIBUTION_LABELS = [
  'good first issue',
  'help wanted',
  'beginner friendly',
  'easy',
  'first-timers-only',
  'up-for-grabs',
  'contributions welcome',
] as const;

// Popular topics for filtering
export const POPULAR_TOPICS = [
  'react',
  'nodejs',
  'machine-learning',
  'web',
  'api',
  'cli',
  'devops',
  'docker',
  'kubernetes',
  'database',
  'frontend',
  'backend',
  'mobile',
  'security',
  'testing',
  'documentation',
] as const;

// Experience level definitions
export const EXPERIENCE_LEVELS = {
  beginner: {
    label: 'Beginner',
    description: 'New to open source, looking for simple issues',
    starRange: [0, 5000],
    labels: ['good first issue', 'beginner friendly', 'easy', 'first-timers-only'],
  },
  intermediate: {
    label: 'Intermediate',
    description: 'Some experience, ready for moderate challenges',
    starRange: [100, 50000],
    labels: ['help wanted', 'contributions welcome'],
  },
  advanced: {
    label: 'Advanced',
    description: 'Experienced contributor, seeking complex projects',
    starRange: [1000, Infinity],
    labels: ['help wanted'],
  },
} as const;

export type ExperienceLevel = keyof typeof EXPERIENCE_LEVELS;
export type PopularLanguage = typeof POPULAR_LANGUAGES[number];
export type ContributionLabel = typeof CONTRIBUTION_LABELS[number];
export type PopularTopic = typeof POPULAR_TOPICS[number];

// Contribution Event Status
export type EventStatus = 'upcoming' | 'active' | 'ended';

// Contribution Event interface (GSOC, GSSOC, Hacktoberfest, etc.)
export interface ContributionEvent {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  description: string;
  longDescription?: string;
  website: string;
  logo?: string;
  color: string; // Brand color for styling
  
  // Dates
  registrationStart?: string;
  registrationEnd?: string;
  contributionStart: string;
  contributionEnd: string;
  
  // Event details
  organizer: string;
  type: 'program' | 'fest' | 'mentorship';
  isPaid: boolean;
  isRemote: boolean;
  
  // Stats & Info
  participatingOrgs?: number;
  totalContributors?: number;
  
  // Related Labels
  labels: string[];
  
  // Status computed from dates
  status?: EventStatus;
}

// Event labels for filtering
export const EVENT_LABELS = [
  'hacktoberfest',
  'gsoc',
  'gssoc',
  'beginner-friendly',
  'mentorship',
  'paid',
  'swag',
] as const;

export type EventLabel = typeof EVENT_LABELS[number];

