import type { Issue, Repository } from '@/types';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface SkillProfile {
  /** Programming languages (matched against GitHub's `language`). */
  languages: string[];
  /** Frameworks and tools (matched against topics, titles and labels). */
  technologies: string[];
  /** Areas like web, backend, devops, docs. */
  interests: string[];
  experienceLevel: ExperienceLevel;
}

export const EMPTY_SKILLS: SkillProfile = {
  languages: [],
  technologies: [],
  interests: [],
  experienceLevel: 'beginner',
};

/** GitHub linguist names for the languages people usually list. */
const LANGUAGE_NAMES: Record<string, string> = {
  javascript: 'JavaScript',
  js: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  python: 'Python',
  go: 'Go',
  golang: 'Go',
  rust: 'Rust',
  java: 'Java',
  kotlin: 'Kotlin',
  swift: 'Swift',
  ruby: 'Ruby',
  php: 'PHP',
  'c++': 'C++',
  cpp: 'C++',
  c: 'C',
  'c#': 'C#',
  csharp: 'C#',
  dart: 'Dart',
  scala: 'Scala',
  elixir: 'Elixir',
  haskell: 'Haskell',
  lua: 'Lua',
  r: 'R',
  julia: 'Julia',
  shell: 'Shell',
  bash: 'Shell',
  html: 'HTML',
  css: 'CSS',
  vue: 'Vue',
  svelte: 'Svelte',
  zig: 'Zig',
  solidity: 'Solidity',
  'objective-c': 'Objective-C',
  perl: 'Perl',
  clojure: 'Clojure',
  erlang: 'Erlang',
  ocaml: 'OCaml',
  'f#': 'F#',
  nix: 'Nix',
  mdx: 'MDX',
  jupyter: 'Jupyter Notebook',
};

/** Normalize a free-text skill to a GitHub language name, or null if it isn't one. */
export function toGitHubLanguage(skill: string): string | null {
  return LANGUAGE_NAMES[skill.trim().toLowerCase()] ?? null;
}

export const POPULAR_LANGUAGES = [
  'TypeScript',
  'JavaScript',
  'Python',
  'Go',
  'Rust',
  'Java',
  'Kotlin',
  'C++',
  'C#',
  'Ruby',
  'PHP',
  'Swift',
  'Dart',
  'C',
  'Scala',
  'Elixir',
  'Shell',
  'HTML',
  'CSS',
  'Vue',
];

export const INTEREST_AREAS: Array<{ value: string; label: string; keywords: string[] }> = [
  { value: 'web', label: 'Web & frontend', keywords: ['frontend', 'ui', 'css', 'html', 'react', 'vue', 'svelte', 'web'] },
  { value: 'backend', label: 'Backend & APIs', keywords: ['api', 'server', 'backend', 'graphql', 'rest', 'database'] },
  { value: 'mobile', label: 'Mobile', keywords: ['android', 'ios', 'mobile', 'flutter', 'react-native'] },
  { value: 'devops', label: 'DevOps & infra', keywords: ['docker', 'kubernetes', 'ci', 'deploy', 'infra', 'terraform'] },
  { value: 'ml', label: 'AI & ML', keywords: ['ml', 'ai', 'model', 'llm', 'machine-learning', 'pytorch', 'tensorflow'] },
  { value: 'data', label: 'Data', keywords: ['data', 'sql', 'analytics', 'etl', 'pandas'] },
  { value: 'security', label: 'Security', keywords: ['security', 'auth', 'crypto', 'vulnerability'] },
  { value: 'docs', label: 'Docs & writing', keywords: ['docs', 'documentation', 'readme', 'guide', 'tutorial'] },
  { value: 'tooling', label: 'Dev tools & CLIs', keywords: ['cli', 'tool', 'lint', 'plugin', 'extension', 'editor'] },
  { value: 'games', label: 'Games & graphics', keywords: ['game', 'graphics', 'engine', '3d', 'shader'] },
  { value: 'web3', label: 'Web3', keywords: ['blockchain', 'web3', 'solidity', 'ethereum', 'smart-contract', 'wallet'] },
];

export function hasSkills(skills: SkillProfile) {
  return skills.languages.length + skills.technologies.length + skills.interests.length > 0;
}

const lower = (values: string[]) => values.map(value => value.toLowerCase());

/** 0–100 fit between a repository and the user's skills. Null when we know nothing about the user. */
export function scoreRepository(repo: Repository, skills: SkillProfile): number | null {
  if (!hasSkills(skills)) return null;
  let score = 0;
  const languages = lower(skills.languages.map(skill => toGitHubLanguage(skill) ?? skill));
  if (repo.language && languages.includes(repo.language.toLowerCase())) score += 45;

  const topics = lower(repo.topics ?? []);
  const techHits = lower(skills.technologies).filter(tech => topics.some(topic => topic.includes(tech)));
  score += Math.min(techHits.length * 15, 30);

  const interestHits = INTEREST_AREAS.filter(area => skills.interests.includes(area.value)).filter(area =>
    area.keywords.some(keyword => topics.some(topic => topic.includes(keyword)))
  );
  score += Math.min(interestHits.length * 10, 15);

  const daysSincePush = (Date.now() - new Date(repo.pushed_at).getTime()) / 86400000;
  if (daysSincePush < 14) score += 10;
  else if (daysSincePush < 60) score += 5;

  return Math.min(100, score);
}

export interface IssueMatch {
  score: number;
  reasons: string[];
}

const BEGINNER_LABELS = ['good first issue', 'good-first-issue', 'beginner', 'easy', 'first-timers-only', 'starter'];
const HELP_LABELS = ['help wanted', 'help-wanted', 'contributions welcome', 'up-for-grabs'];

/** Explainable match between an issue and the user's skills. */
export function scoreIssue(issue: Issue, skills: SkillProfile, repoLanguage?: string | null): IssueMatch {
  const reasons: string[] = [];
  let score = 0;
  const labels = lower(issue.labels?.map(label => label.name) ?? []);
  const text = `${issue.title} ${labels.join(' ')}`.toLowerCase();

  const languages = lower(skills.languages.map(skill => toGitHubLanguage(skill) ?? skill));
  if (repoLanguage && languages.includes(repoLanguage.toLowerCase())) {
    score += 40;
    reasons.push(repoLanguage);
  }

  const beginner = labels.some(label => BEGINNER_LABELS.some(b => label.includes(b)));
  const help = labels.some(label => HELP_LABELS.some(h => label.includes(h)));
  if (skills.experienceLevel === 'beginner' && beginner) {
    score += 25;
    reasons.push('Beginner friendly');
  } else if (skills.experienceLevel === 'intermediate' && (help || beginner)) {
    score += 20;
    reasons.push(help ? 'Help wanted' : 'Approachable');
  } else if (skills.experienceLevel === 'advanced' && !beginner) {
    score += 15;
  }

  const techHits = skills.technologies.filter(tech => tech.length > 1 && text.includes(tech.toLowerCase()));
  if (techHits.length) {
    score += Math.min(techHits.length * 12, 24);
    reasons.push(techHits[0]);
  }

  for (const area of INTEREST_AREAS) {
    if (skills.interests.includes(area.value) && area.keywords.some(keyword => text.includes(keyword))) {
      score += 11;
      reasons.push(area.label);
      break;
    }
  }

  return { score: Math.min(100, score), reasons: reasons.slice(0, 3) };
}
