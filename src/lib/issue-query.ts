/*
 * GitHub search query builders. Plain functions with no network access, so
 * client components (alert rules, feed links) can build the same queries the
 * server runs; lib/github re-exports them.
 */

export const ISSUE_PRESETS = ['good-first', 'help-wanted', 'first-timers', 'docs', 'unassigned', 'all'] as const;
export type IssuePreset = (typeof ISSUE_PRESETS)[number];

export const ISSUE_SORTS = ['created', 'updated', 'comments', 'reactions'] as const;
export type IssueSort = (typeof ISSUE_SORTS)[number];

/** GitHub qualifier values must be quoted when they contain spaces. */
export function qualifier(name: string, value: string) {
  const clean = value.replace(/"/g, '').trim();
  return /\s/.test(clean) ? `${name}:"${clean}"` : `${name}:${clean}`;
}

export interface IssueQuery {
  preset?: IssuePreset;
  language?: string;
  labels?: string[];
  text?: string;
  minStars?: number;
}

export function buildIssueQuery({ preset = 'good-first', language, labels = [], text, minStars }: IssueQuery) {
  const parts = ['is:issue', 'is:open', 'archived:false'];
  if (preset === 'good-first') parts.push('label:"good first issue"', 'no:assignee');
  else if (preset === 'help-wanted') parts.push('label:"help wanted"', 'no:assignee');
  // Kept for people who have never contributed (first-timers-only convention).
  else if (preset === 'first-timers') parts.push('label:first-timers-only', 'no:assignee');
  // Documentation work: a gentle way in that every project needs.
  else if (preset === 'docs') parts.push('label:documentation', 'no:assignee');
  else if (preset === 'unassigned') parts.push('no:assignee');
  for (const label of labels.slice(0, 5)) parts.push(qualifier('label', label));
  if (language) parts.push(qualifier('language', language));
  if (minStars && minStars > 0) parts.push(`stars:>=${Math.floor(minStars)}`);
  if (text) parts.push(text.replace(/[\r\n]+/g, ' ').slice(0, 120));
  return parts.join(' ');
}

export interface RepoQuery {
  text?: string;
  language?: string;
  topics?: string[];
  minStars?: number;
}

export function buildRepoQuery({ text, language, topics = [], minStars }: RepoQuery) {
  const parts: string[] = [];
  if (text) parts.push(text.replace(/[\r\n]+/g, ' ').slice(0, 120));
  if (language) parts.push(qualifier('language', language));
  for (const topic of topics.slice(0, 5)) parts.push(qualifier('topic', topic));
  if (minStars && minStars > 0) parts.push(`stars:>=${Math.floor(minStars)}`);
  // Default view: active projects that are asking for help.
  if (parts.length === 0) parts.push('help-wanted-issues:>0', 'stars:>=100');
  parts.push('archived:false');
  return parts.join(' ');
}
