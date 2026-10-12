import type { AlertPreset, Database } from '@/types/database';
import { buildIssueQuery, ISSUE_PRESETS } from './issue-query';

/*
 * Issue alerts: saved searches that tell a member when new issues match.
 * Plain functions shared by the server (checks, feeds, email digests) and
 * the browser (the alert form, feed links).
 */

export type AlertRule = Database['public']['Tables']['alert_rules']['Row'];

/** Per member; migration 08 enforces it too. */
export const ALERT_LIMIT = 10;

export const ALERT_PRESETS: Array<{ value: AlertPreset; label: string }> = [
  { value: 'good-first', label: 'Good first issues' },
  { value: 'help-wanted', label: 'Help wanted' },
  { value: 'first-timers', label: 'First-timers only' },
  { value: 'docs', label: 'Documentation' },
  { value: 'unassigned', label: 'Any unassigned issue' },
  { value: 'all', label: 'Any open issue' },
];

/** What an alert looks for. */
export interface AlertQuery {
  preset: AlertPreset;
  language: string | null;
  labels: string[];
  repos: string[];
  keywords: string | null;
  minStars: number;
}

export const ALERT_FIELD_LIMITS = { name: 80, language: 40, label: 50, labels: 5, repos: 12, keywords: 120, minStars: 1_000_000 };

const REPO = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;
const oneLine = (value: string) => value.replace(/\s+/g, ' ').trim();

export function queryOf(rule: Pick<AlertRule, 'preset' | 'language' | 'labels' | 'repos' | 'keywords' | 'min_stars'>): AlertQuery {
  return {
    preset: rule.preset,
    language: rule.language,
    labels: rule.labels ?? [],
    repos: rule.repos ?? [],
    keywords: rule.keywords,
    minStars: rule.min_stars ?? 0,
  };
}

export type AlertProblems = Partial<Record<'name' | 'language' | 'labels' | 'repos' | 'keywords' | 'minStars' | 'query', string>>;

export interface AlertInput {
  name: string;
  preset: string;
  language: string;
  labels: string[];
  repos: string[];
  keywords: string;
  minStars: string | number;
}

/** A name for an alert the member didn't name: "Good first issues in Rust". */
export function defaultAlertName(query: AlertQuery): string {
  const what = ALERT_PRESETS.find(p => p.value === query.preset)?.label ?? 'Issues';
  const where = query.repos.length === 1 ? ` in ${query.repos[0]}` : query.language ? ` in ${query.language}` : '';
  const about = query.keywords ? ` about “${query.keywords}”` : '';
  return `${what}${where}${about}`.slice(0, ALERT_FIELD_LIMITS.name);
}

/** Checks and cleans the alert form. `problems` is keyed by field, worded for the form. */
export function readAlertInput(input: AlertInput): { value: ({ name: string } & AlertQuery) | null; problems: AlertProblems } {
  const problems: AlertProblems = {};
  const preset = ISSUE_PRESETS.find(p => p === input.preset) ?? 'good-first';

  const language = oneLine(input.language).replace(/"/g, '') || null;
  if (language && language.length > ALERT_FIELD_LIMITS.language) problems.language = 'Use a GitHub language name, such as Rust or TypeScript.';

  const labels = Array.from(new Set(input.labels.map(oneLine).filter(Boolean)));
  if (labels.length > ALERT_FIELD_LIMITS.labels) problems.labels = `Keep to ${ALERT_FIELD_LIMITS.labels} labels.`;
  else if (labels.some(label => label.length > ALERT_FIELD_LIMITS.label || /["\\]/.test(label))) problems.labels = 'Labels can’t contain quotes or backslashes.';

  const repos = Array.from(new Set(input.repos.map(repo => oneLine(repo).replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\/+$/, '')).filter(Boolean)));
  if (repos.length > ALERT_FIELD_LIMITS.repos) problems.repos = `Keep to ${ALERT_FIELD_LIMITS.repos} repositories.`;
  else if (repos.some(repo => !REPO.test(repo))) problems.repos = 'Write repositories as owner/name.';

  const keywords = oneLine(input.keywords) || null;
  if (keywords && keywords.length > ALERT_FIELD_LIMITS.keywords) problems.keywords = `Keep keywords under ${ALERT_FIELD_LIMITS.keywords} characters.`;

  const stars = typeof input.minStars === 'number' ? input.minStars : input.minStars.trim() === '' ? 0 : Number(input.minStars);
  if (!Number.isInteger(stars) || stars < 0 || stars > ALERT_FIELD_LIMITS.minStars) problems.minStars = 'Use a whole number of stars.';

  const query: AlertQuery = { preset, language, labels, repos, keywords, minStars: Number.isInteger(stars) ? Math.max(0, stars) : 0 };
  const broad = (preset === 'all' || preset === 'unassigned') && !language && labels.length === 0 && repos.length === 0 && !keywords;
  if (broad) problems.query = 'Add a language, label, repository or keywords, or this alert would match every new issue on GitHub.';

  const name = oneLine(input.name) || defaultAlertName(query);
  if (name.length > ALERT_FIELD_LIMITS.name) problems.name = `Keep the name under ${ALERT_FIELD_LIMITS.name} characters.`;

  return { value: Object.keys(problems).length ? null : { name, ...query }, problems };
}

/** GitHub's date qualifier wants whole seconds. */
const githubTime = (iso: string) => new Date(iso).toISOString().replace(/\.\d{3}Z$/, 'Z');

/** The GitHub search behind an alert; with `since`, only issues opened after it. */
export function alertSearchQuery(query: AlertQuery, since?: string): string {
  return [
    buildIssueQuery({
      preset: query.preset,
      language: query.language ?? undefined,
      labels: query.labels,
      text: query.keywords ?? undefined,
      minStars: query.minStars,
    }),
    ...query.repos.map(repo => `repo:${repo}`),
    since && `created:>${githubTime(since)}`,
  ]
    .filter(Boolean)
    .join(' ');
}

/** Short descriptions of what the alert matches, for chips. */
export function describeAlert(query: AlertQuery): string[] {
  return [
    ALERT_PRESETS.find(p => p.value === query.preset)?.label ?? query.preset,
    query.language,
    ...query.labels.map(label => `label: ${label}`),
    ...(query.repos.length > 2 ? [`${query.repos.length} repositories`] : query.repos),
    query.keywords && `“${query.keywords}”`,
    query.minStars > 0 && `${query.minStars.toLocaleString('en-US')}+ stars`,
  ].filter((part): part is string => Boolean(part));
}

/** URL parameters for the public feed of an alert's search. */
export function alertSearchParams(query: AlertQuery): string {
  const params = new URLSearchParams({ preset: query.preset });
  if (query.language) params.set('language', query.language);
  if (query.labels.length) params.set('labels', query.labels.join(','));
  if (query.repos.length) params.set('repos', query.repos.join(','));
  if (query.keywords) params.set('q', query.keywords);
  if (query.minStars > 0) params.set('stars', String(query.minStars));
  return params.toString();
}

/** Reads a feed URL back into a query; null when it describes no valid alert. */
export function readAlertSearchParams(params: URLSearchParams): AlertQuery | null {
  const list = (key: string) => (params.get(key) ?? '').split(',').map(value => value.trim()).filter(Boolean);
  const { value } = readAlertInput({
    name: 'feed',
    preset: params.get('preset') ?? 'good-first',
    language: params.get('language') ?? '',
    labels: list('labels'),
    repos: list('repos'),
    keywords: params.get('q') ?? '',
    minStars: params.get('stars') ?? '0',
  });
  if (!value) return null;
  return { preset: value.preset, language: value.language, labels: value.labels, repos: value.repos, keywords: value.keywords, minStars: value.minStars };
}

/** The same search in Discover, which knows the preset, language and keywords. */
export function discoverHrefFor(query: AlertQuery): string {
  const params = new URLSearchParams();
  if (query.preset !== 'good-first') params.set('preset', query.preset);
  if (query.language) params.set('language', query.language);
  if (query.keywords) params.set('q', query.keywords);
  const search = params.toString();
  return search ? `/discover?${search}` : '/discover';
}
