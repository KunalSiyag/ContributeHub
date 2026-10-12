import type { DiscussionCategory } from '@/types/database';

/** Discussion categories, in the order the forum shows them. */
export const CATEGORIES: Array<{ value: DiscussionCategory; label: string; blurb: string }> = [
  { value: 'general', label: 'General', blurb: 'Anything about contributing to open source.' },
  { value: 'programs', label: 'Programs', blurb: 'GSoC, LFX, Outreachy and the rest: applications, proposals and timelines.' },
  { value: 'help', label: 'Help with an issue', blurb: 'Stuck on a setup or a fix? Describe it and ask.' },
  { value: 'showcase', label: 'Show your work', blurb: 'Merged a pull request or shipped something? Share it.' },
];

export function categoryLabel(value: string) {
  return CATEGORIES.find(category => category.value === value)?.label ?? 'General';
}

export function isCategory(value: string | undefined): value is DiscussionCategory {
  return CATEGORIES.some(category => category.value === value);
}

/** PostgREST answers these when migration 07 hasn't been applied yet. */
export function isMissingTable(error: { code?: string } | null | undefined) {
  return error?.code === 'PGRST205' || error?.code === '42P01';
}

export const TITLE_LIMITS = { min: 8, max: 140 } as const;
export const BODY_LIMIT = 8000;

/** "owner" or "owner/repo" (a GitHub URL works too); null when it isn't one. */
export function readRelated(value: string): string | null {
  const clean = value.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\/+$/, '');
  return /^[A-Za-z0-9-]{1,39}(\/[A-Za-z0-9._-]{1,100})?$/.test(clean) ? clean : null;
}

/** Where a discussion's related repository or organization lives. */
export function relatedHref(related: string): string {
  return related.includes('/') ? `/repos/${related}` : `https://github.com/${related}`;
}
