import 'server-only';

/**
 * Projects that curate tasks for newcomers, merged from four community lists
 * that are kept current by their maintainers: Up For Grabs (each project names
 * its own starter label), goodfirstissue.dev, Awesome for Beginners and For
 * Good First Issue (social-impact projects, tagged with the UN Sustainable
 * Development Goals they serve). Read as raw files, refreshed daily; a source
 * that is down just contributes nothing.
 */

export const STARTER_SOURCES = {
  'up-for-grabs': { name: 'Up For Grabs', url: 'https://up-for-grabs.net' },
  goodfirstissue: { name: 'goodfirstissue.dev', url: 'https://goodfirstissue.dev' },
  'awesome-for-beginners': { name: 'Awesome for Beginners', url: 'https://github.com/MunGell/awesome-for-beginners' },
  'for-good': { name: 'For Good First Issue', url: 'https://forgoodfirstissue.dev' },
} as const;
export type StarterSource = keyof typeof STARTER_SOURCES;

export interface StarterProject {
  /** owner/name, as GitHub spells it in the source. */
  repo: string;
  name: string;
  description: string;
  /** The label the project uses for newcomer tasks. */
  label: string;
  tags: string[];
  sources: StarterSource[];
}

const SLUG = /github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})/i;
const slugOf = (url: unknown) => {
  if (typeof url !== 'string') return null;
  const match = SLUG.exec(url);
  return match ? `${match[1]}/${match[2].replace(/\.git$/, '')}` : null;
};
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export function parseUpForGrabs(raw: unknown): StarterProject[] {
  if (!raw || typeof raw !== 'object') return [];
  return Object.values(raw as Record<string, Record<string, unknown>>)
    .map((entry): StarterProject | null => {
      const label = (entry.upforgrabs ?? {}) as Record<string, unknown>;
      const repo = slugOf(label.link) ?? slugOf(entry.site);
      if (!repo) return null;
      return {
        repo,
        name: text(entry.name) || repo.split('/')[1],
        description: text(entry.desc),
        label: text(label.name) || 'good first issue',
        tags: (Array.isArray(entry.tags) ? entry.tags : []).filter((t): t is string => typeof t === 'string').slice(0, 8),
        sources: ['up-for-grabs'],
      };
    })
    .filter((p): p is StarterProject => p !== null);
}

export function parseAwesomeForBeginners(raw: unknown): StarterProject[] {
  const repos = (raw as { repositories?: unknown } | null)?.repositories;
  if (!Array.isArray(repos)) return [];
  return repos
    .map((entry): StarterProject | null => {
      const item = entry as Record<string, unknown>;
      const repo = slugOf(item.link);
      if (!repo) return null;
      return {
        repo,
        name: text(item.name) || repo.split('/')[1],
        description: text(item.description),
        label: text(item.label) || 'good first issue',
        tags: (Array.isArray(item.technologies) ? item.technologies : [])
          .filter((t): t is string => typeof t === 'string')
          .map(t => t.toLowerCase()),
        sources: ['awesome-for-beginners'],
      };
    })
    .filter((p): p is StarterProject => p !== null);
}

/** repositories = ['github.com/owner/repo', …] */
export function parseGoodFirstIssueToml(raw: string): StarterProject[] {
  return [...raw.matchAll(/['"]github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})['"]/g)].map(([, owner, name]) => ({
    repo: `${owner}/${name}`,
    name,
    description: '',
    label: 'good first issue',
    tags: [],
    sources: ['goodfirstissue'],
  }));
}

/** Short names for the UN Sustainable Development Goals, as For Good First Issue tags them (sdg-1 … sdg-17). */
const SDG_TAGS = [
  'no poverty',
  'zero hunger',
  'health',
  'education',
  'gender equality',
  'clean water',
  'clean energy',
  'decent work',
  'infrastructure',
  'reduced inequalities',
  'sustainable cities',
  'responsible consumption',
  'climate action',
  'life below water',
  'life on land',
  'justice and institutions',
  'partnerships',
];

const NEWCOMER_LABEL = /good.?first|first.?timer|beginner|newcomer|starter|easy|up.?for.?grabs|help.?wanted/i;

/** generated.json = { repositories: [{ owner, name, description, language, topics, issues }] } */
export function parseForGoodFirstIssue(raw: unknown): StarterProject[] {
  const repos = (raw as { repositories?: unknown } | null)?.repositories;
  if (!Array.isArray(repos)) return [];
  return repos
    .map((entry): StarterProject | null => {
      const item = entry as Record<string, unknown>;
      const repo = slugOf(item.url) ?? (text(item.owner) && text(item.name) ? `${text(item.owner)}/${text(item.name)}` : null);
      if (!repo || !SLUG.test(`github.com/${repo}`)) return null;
      // The newcomer-sounding label its listed issues carry most is the project's starter label.
      const labels = new Map<string, number>();
      for (const issue of Array.isArray(item.issues) ? item.issues : []) {
        const issueLabels = (issue as { labels?: unknown }).labels;
        for (const label of Array.isArray(issueLabels) ? issueLabels : []) {
          const name = text((label as { display?: unknown }).display);
          if (name) labels.set(name, (labels.get(name) ?? 0) + 1);
        }
      }
      const label =
        [...labels].sort((a, b) => Number(NEWCOMER_LABEL.test(b[0])) - Number(NEWCOMER_LABEL.test(a[0])) || b[1] - a[1])[0]?.[0] ??
        'good first issue';
      const goals = (Array.isArray(item.topics) ? item.topics : [])
        .map(topic => /^sdg-(\d{1,2})$/.exec(text((topic as { id?: unknown }).id))?.[1])
        .map(n => (n ? SDG_TAGS[Number(n) - 1] : undefined))
        .filter((t): t is string => Boolean(t));
      const language = text((item.language as { display?: unknown } | null)?.display).toLowerCase();
      return {
        repo,
        name: text(item.name) || repo.split('/')[1],
        description: text(item.description),
        label,
        tags: Array.from(new Set(['social good', ...goals, ...(language ? [language] : [])])).slice(0, 8),
        sources: ['for-good'],
      };
    })
    .filter((p): p is StarterProject => p !== null);
}

/** One entry per repository; projects several lists agree on come first. */
export function mergeStarterProjects(lists: StarterProject[][]): StarterProject[] {
  const merged = new Map<string, StarterProject>();
  for (const list of lists) {
    for (const project of list) {
      const key = project.repo.toLowerCase();
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, { ...project, tags: [...project.tags], sources: [...project.sources] });
        continue;
      }
      existing.description ||= project.description;
      if (existing.label === 'good first issue' && project.label !== 'good first issue') existing.label = project.label;
      existing.tags = Array.from(new Set([...existing.tags, ...project.tags])).slice(0, 10);
      existing.sources = Array.from(new Set([...existing.sources, ...project.sources]));
    }
  }
  return [...merged.values()].sort((a, b) => b.sources.length - a.sources.length || a.repo.localeCompare(b.repo));
}

async function get(url: string, as: 'json' | 'text'): Promise<unknown> {
  try {
    const response = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    return as === 'json' ? await response.json() : await response.text();
  } catch {
    return null;
  }
}

export async function getStarterProjects(): Promise<StarterProject[]> {
  const [upForGrabs, awesome, goodFirst, forGood] = await Promise.all([
    get('https://up-for-grabs.net/javascripts/projects.json', 'json'),
    get('https://raw.githubusercontent.com/MunGell/awesome-for-beginners/main/data.json', 'json'),
    get('https://raw.githubusercontent.com/deepsourcelabs/good-first-issue/master/data/repositories.toml', 'text'),
    get('https://raw.githubusercontent.com/github/forgoodfirstissue/main/generated.json', 'json'),
  ]);
  return mergeStarterProjects([
    // First, so its "social good" tag survives the cap on merged tags.
    parseForGoodFirstIssue(forGood),
    parseUpForGrabs(upForGrabs),
    parseAwesomeForBeginners(awesome),
    typeof goodFirst === 'string' ? parseGoodFirstIssueToml(goodFirst) : [],
  ]);
}

/** Issues carrying the project's newcomer label, on GitHub. */
export function starterIssuesUrl(project: Pick<StarterProject, 'repo' | 'label'>) {
  return `https://github.com/${project.repo}/issues?q=${encodeURIComponent(`is:issue is:open label:"${project.label}"`)}`;
}
