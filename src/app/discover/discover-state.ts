import { POPULAR_LANGUAGES, toGitHubLanguage } from '@/lib/matching';

/*
 * URL state for /discover. The query string is the source of truth; these
 * helpers parse it defensively and write it back with defaults omitted so
 * shared links stay short.
 */

export const DISCOVER_PATH = '/discover';
export const SEARCH_INPUT_ID = 'discover-search';

export const HEADER = {
  eyebrow: 'Explore',
  title: 'Discover',
  description: 'Live GitHub search, ranked by your skills when you add them.',
};

export const TABS = [
  { value: 'issues', label: 'Issues' },
  { value: 'projects', label: 'Projects' },
  { value: 'organizations', label: 'Organizations' },
] as const;
export type DiscoverTab = (typeof TABS)[number]['value'];

export const ISSUE_PRESETS = [
  { value: 'good-first', label: 'Good first issue' },
  { value: 'help-wanted', label: 'Help wanted' },
  { value: 'first-timers', label: 'First-timers only' },
  { value: 'docs', label: 'Documentation' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'all', label: 'All open' },
] as const;
export type IssuePreset = (typeof ISSUE_PRESETS)[number]['value'];

/** Extra labels people filter by (Ossium offers the same set); presets cover good first issue, help wanted and documentation. */
export const ISSUE_LABELS = [
  { value: '', label: 'Any label' },
  { value: 'bug', label: 'Bug' },
  { value: 'enhancement', label: 'Enhancement' },
  { value: 'feature', label: 'Feature' },
  { value: 'question', label: 'Question' },
  { value: 'beginner friendly', label: 'Beginner friendly' },
  { value: 'hacktoberfest', label: 'Hacktoberfest' },
] as const;
export type IssueLabel = (typeof ISSUE_LABELS)[number]['value'];

export const ISSUE_SORTS = [
  { value: 'created', label: 'Newest' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'comments', label: 'Most discussed' },
] as const;
export type IssueSort = (typeof ISSUE_SORTS)[number]['value'];

export const REPO_SORTS = [
  { value: 'stars', label: 'Most stars' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'help-wanted-issues', label: 'Most help-wanted issues' },
] as const;
export type RepoSort = (typeof REPO_SORTS)[number]['value'];

export const STAR_FILTERS = [
  { value: '0', label: 'Any stars' },
  { value: '100', label: '100+ stars' },
  { value: '1000', label: '1k+ stars' },
  { value: '10000', label: '10k+ stars' },
] as const;
export type StarFilter = (typeof STAR_FILTERS)[number]['value'];

export const TOPICS = [
  'react',
  'python',
  'machine-learning',
  'devops',
  'cli',
  'documentation',
  'web',
  'api',
  'game',
  'security',
  'web3',
  'defi',
  'smart-contracts',
  'zero-knowledge',
  'wallet',
] as const;

export const PROGRAMS = [
  { value: 'all', label: 'All' },
  { value: 'gsoc', label: 'GSoC' },
  { value: 'gssoc', label: 'GSSoC' },
  { value: 'hacktoberfest', label: 'Hacktoberfest' },
  { value: 'lfx', label: 'LFX' },
] as const;
export type ProgramKey = (typeof PROGRAMS)[number]['value'];

export const ORG_SORTS = [
  { value: 'stars', label: 'Most stars' },
  { value: 'active', label: 'Recently active' },
  { value: 'gsoc-years', label: 'Most GSoC years' },
  { value: 'name', label: 'Name A–Z' },
] as const;
export type OrgSort = (typeof ORG_SORTS)[number]['value'];

/** Results per request; GitHub search serves at most 1,000 results per query. */
export const PER_PAGE = 20;
/** /api/issues accepts pages 1–50 (50 × 20 = 1,000). */
export const ISSUE_MAX_PAGE = 50;
/** /api/repositories clamps `page` to 34. */
export const REPO_MAX_PAGE = 34;

export interface DiscoverState {
  tab: DiscoverTab;
  q: string;
  /** GitHub linguist name, shared by all tabs. Empty means any language. */
  language: string;
  preset: IssuePreset;
  /** One extra label for issues; empty means any. */
  label: IssueLabel;
  issueSort: IssueSort;
  stars: StarFilter;
  topic: string;
  repoSort: RepoSort;
  program: ProgramKey;
  /** A year the organization took part in its program (GSoC, GSSoC, Hacktoberfest, LFX); empty means any. */
  year: string;
  orgSort: OrgSort;
}

export const DEFAULT_STATE: DiscoverState = {
  tab: 'issues',
  q: '',
  language: '',
  preset: 'good-first',
  label: '',
  issueSort: 'created',
  stars: '0',
  topic: '',
  repoSort: 'stars',
  program: 'all',
  year: '',
  orgSort: 'stars',
};

type Option<T extends string> = { readonly value: T };

function pick<T extends string>(value: string | null, options: readonly Option<T>[], fallback: T): T {
  return options.find(option => option.value === value)?.value ?? fallback;
}

/** Canonical casing for a language param ("go" → "Go", "golang" → "Go"). */
export function normalizeLanguage(value: string | null): string {
  const clean = (value ?? '').replace(/["\r\n]/g, '').trim().slice(0, 40);
  if (!clean) return '';
  const lower = clean.toLowerCase();
  return POPULAR_LANGUAGES.find(language => language.toLowerCase() === lower) ?? toGitHubLanguage(clean) ?? clean;
}

function normalizeTopic(value: string | null): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 50);
}

interface ParamReader {
  get(name: string): string | null;
}

export function parseDiscoverState(params: ParamReader): DiscoverState {
  const tab = pick(params.get('tab'), TABS, DEFAULT_STATE.tab);
  const sort = params.get('sort');
  // `query` is the pre-redesign name for `q`; old links keep working.
  const q = (params.get('q') ?? params.get('query') ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 120);

  return {
    tab,
    q,
    language: normalizeLanguage(params.get('language')),
    preset: pick(params.get('preset'), ISSUE_PRESETS, DEFAULT_STATE.preset),
    label: pick(params.get('label'), ISSUE_LABELS, DEFAULT_STATE.label),
    issueSort: tab === 'issues' ? pick(sort, ISSUE_SORTS, DEFAULT_STATE.issueSort) : DEFAULT_STATE.issueSort,
    stars: pick(params.get('stars'), STAR_FILTERS, DEFAULT_STATE.stars),
    topic: normalizeTopic(params.get('topic')),
    repoSort: tab === 'projects' ? pick(sort, REPO_SORTS, DEFAULT_STATE.repoSort) : DEFAULT_STATE.repoSort,
    program: pick(params.get('program'), PROGRAMS, DEFAULT_STATE.program),
    year: /^20\d\d$/.test(params.get('year') ?? '') ? (params.get('year') as string) : '',
    orgSort: tab === 'organizations' ? pick(sort, ORG_SORTS, DEFAULT_STATE.orgSort) : DEFAULT_STATE.orgSort,
  };
}

/** Query string for a state: only the active tab's filters, defaults left out. */
export function toSearchString(state: DiscoverState): string {
  const params = new URLSearchParams();
  if (state.tab !== DEFAULT_STATE.tab) params.set('tab', state.tab);
  if (state.q) params.set('q', state.q);

  if (state.tab === 'issues') {
    if (state.preset !== DEFAULT_STATE.preset) params.set('preset', state.preset);
    if (state.label) params.set('label', state.label);
    if (state.language) params.set('language', state.language);
    if (state.issueSort !== DEFAULT_STATE.issueSort) params.set('sort', state.issueSort);
  } else if (state.tab === 'projects') {
    if (state.language) params.set('language', state.language);
    if (state.stars !== DEFAULT_STATE.stars) params.set('stars', state.stars);
    if (state.topic) params.set('topic', state.topic);
    if (state.repoSort !== DEFAULT_STATE.repoSort) params.set('sort', state.repoSort);
  } else {
    if (state.program !== DEFAULT_STATE.program) params.set('program', state.program);
    if (state.year) params.set('year', state.year);
    if (state.language) params.set('language', state.language);
    if (state.orgSort !== DEFAULT_STATE.orgSort) params.set('sort', state.orgSort);
  }

  return params.toString();
}

export function discoverHref(state: DiscoverState): string {
  const search = toSearchString(state);
  return search ? `${DISCOVER_PATH}?${search}` : DISCOVER_PATH;
}

/** Tab links keep the text search and reset the other filters. */
export function tabItems(q: string) {
  return TABS.map(tab => ({
    value: tab.value,
    label: tab.label,
    href: discoverHref({ ...DEFAULT_STATE, tab: tab.value, q }),
  }));
}

/** True when the text search or any filter on the active tab differs from its default. */
export function hasActiveFilters(state: DiscoverState): boolean {
  return toSearchString(state) !== toSearchString({ ...DEFAULT_STATE, tab: state.tab });
}

/** Params for GET /api/issues (without `page`). */
export function issueRequestParams(state: DiscoverState): string {
  const params = new URLSearchParams({ preset: state.preset });
  if (state.label) params.set('labels', state.label);
  if (state.language) params.set('language', state.language);
  params.set('sort', state.issueSort);
  if (state.q) params.set('query', state.q);
  params.set('per_page', String(PER_PAGE));
  return params.toString();
}

/** Params for GET /api/repositories (without `page`). */
export function repoRequestParams(state: DiscoverState): string {
  const params = new URLSearchParams();
  if (state.q) params.set('query', state.q);
  if (state.language) params.set('language', state.language);
  if (state.stars !== '0') params.set('minStars', state.stars);
  if (state.topic) params.set('topics', state.topic);
  params.set('sort', state.repoSort);
  params.set('per_page', String(PER_PAGE));
  return params.toString();
}

/** "All languages" plus the given list; keeps a value from the URL selectable even when it isn't listed. */
export function languageOptions(current: string, languages: readonly string[] = POPULAR_LANGUAGES) {
  const list = current && !languages.includes(current) ? [current, ...languages] : languages;
  return [{ value: '', label: 'All languages' }, ...list.map(language => ({ value: language, label: language }))];
}

const GITHUB_WEB_SORTS: Record<string, string> = {
  created: 'created',
  updated: 'updated',
  comments: 'comments',
  stars: 'stars',
};

/** The same search on github.com, ordered like ours where GitHub's web UI supports it. */
export function githubSearchUrl(query: string, type: 'issues' | 'repositories', sort: string): string {
  const webSort = GITHUB_WEB_SORTS[sort];
  const order = webSort ? `&s=${webSort}&o=desc` : '';
  return `https://github.com/search?q=${encodeURIComponent(query)}&type=${type}${order}`;
}

const numberFormat = new Intl.NumberFormat('en-US');

export function formatCount(value: number): string {
  return numberFormat.format(value);
}

/** "1,284" or "1,000+" — GitHub search caps results at 1,000, and the API clamps the total there. */
export function formatTotal(total: number): string {
  return total >= 1000 ? '1,000+' : numberFormat.format(total);
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

export function organizationsLabel(count: number): string {
  return `${formatCount(count)} ${pluralize(count, 'organization', 'organizations')}`;
}
