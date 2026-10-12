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
  reactions?: {
    total_count: number;
    '+1': number;
    '-1': number;
    laugh: number;
    hooray: number;
    confused: number;
    heart: number;
    rocket: number;
    eyes: number;
  };
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

// GitHub Search API response
export interface SearchResponse<T> {
  total_count: number;
  incomplete_results: boolean;
  items: T[];
}

// Contribution Event Status
export type EventStatus = 'upcoming' | 'active' | 'ended';

export type EventPhase =
  | 'pre-announcement'
  | 'applications-open'
  | 'applications-closed'
  | 'running'
  | 'ended';

// A concrete next milestone the UI can count down to
export interface EventDeadline {
  label: string;
  date: string;
}

// Contribution Event interface (GSOC, GSSOC, Hacktoberfest, etc.)
export interface ContributionEvent {
  id: string;
  slug: string;
  /** Template key shared by every edition, e.g. "gsoc". */
  programKey: string;
  name: string;
  shortName: string;
  description: string;
  longDescription?: string;
  website: string;
  logo?: string;
  color: string; // Brand color for styling

  // Dates
  applicationStart?: string;
  applicationDeadline?: string;
  registrationStart?: string;
  registrationEnd?: string;
  contributionStart: string;
  contributionEnd: string;

  // Event details
  organizer: string;
  type: 'program' | 'fest' | 'mentorship';
  isPaid: boolean;
  isRemote: boolean;
  stipendNote?: string;
  applicationUrl?: string;
  cohortsNote?: string;

  // Stats & Info
  participatingOrgs?: number;
  totalContributors?: number;

  // Related Labels
  labels: string[];

  // Status computed from dates
  status?: EventStatus;
  phase?: EventPhase;
  nextDeadline?: EventDeadline;
  editionYear?: number;
  /** Page the dates come from when the program publishes them (e.g. GSoC); unset for calendar rules. */
  officialSource?: string;
  /** Set when the dates come from the community program list instead. */
  communitySource?: string;
  /** Set when the edition isn't announced yet and repeats last year's published dates. */
  projectedFrom?: { year: number; source: string; community: boolean };
  /** Further official dates (results, final deadlines…), in date order. */
  milestones?: EventDeadline[];
}
