import type { Metadata } from 'next';
import type { Repository } from '@/types';
import { GitHubError, searchRepositories } from '@/lib/github';
import RepoRow from '@/components/RepoRow';
import { EmptyState, Notice, PageHeader } from '@/components/ui/primitives';
import { PillLink, Pills } from '@/components/ui/Tabs';
import { IconTrendingUp } from '@/components/icons';
import rows from '@/components/rows.module.css';
import styles from './page.module.css';

const description =
  'New open source repositories gaining stars fastest this week, month or year, filtered by language and topic, including AI and Web3.';

export const metadata: Metadata = {
  title: 'Rising repositories',
  description,
  alternates: { canonical: '/trending' },
  openGraph: { type: 'website', siteName: 'Orion', title: 'Rising repositories', description, url: '/trending' },
};

const WINDOWS = [
  { value: 'week', label: 'This week', days: 7, minStars: 10 },
  { value: 'month', label: 'This month', days: 30, minStars: 25 },
  { value: 'year', label: 'This year', days: 365, minStars: 100 },
] as const;

const LANGUAGES = ['TypeScript', 'Python', 'Rust', 'Go', 'JavaScript', 'Java', 'C++', 'Kotlin'];

/** GitHub topics with real coverage for each area. */
const TOPICS = [
  { value: 'llm', label: 'LLMs' },
  { value: 'ai-agents', label: 'AI agents' },
  { value: 'web3', label: 'Web3' },
  { value: 'blockchain', label: 'Blockchain' },
  { value: 'developer-tools', label: 'Developer tools' },
  { value: 'cli', label: 'CLI' },
  { value: 'self-hosted', label: 'Self-hosted' },
  { value: 'security', label: 'Security' },
];

type Params = { since?: string; language?: string; topic?: string; help?: string };

function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.find(option => option.toLowerCase() === value?.toLowerCase());
}

function href(current: Params, patch: Partial<Params>) {
  const next = { ...current, ...patch };
  const search = new URLSearchParams();
  if (next.since && next.since !== 'week') search.set('since', next.since);
  if (next.language) search.set('language', next.language);
  if (next.topic) search.set('topic', next.topic);
  if (next.help === '1') search.set('help', '1');
  const query = search.toString();
  return query ? `/trending?${query}` : '/trending';
}

/** First day of the window, as GitHub's created: qualifier wants it. */
function windowStart(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

type Result = { items: Repository[]; total: number } | { error: string };

async function load(q: string): Promise<Result> {
  try {
    const data = await searchRepositories(q, { sort: 'stars', perPage: 30, revalidate: 1800 });
    return { items: data.items, total: data.total_count };
  } catch (error) {
    return {
      error:
        error instanceof GitHubError && error.rateLimited
          ? 'GitHub is rate limiting searches right now. Try again in a minute.'
          : 'GitHub could not be reached. Try again shortly.',
    };
  }
}

export default async function TrendingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const raw = await searchParams;
  const window = WINDOWS.find(w => w.value === raw.since) ?? WINDOWS[0];
  const language = pick(raw.language, LANGUAGES);
  const topic = TOPICS.find(t => t.value === raw.topic)?.value;
  const help = raw.help === '1';
  const current: Params = { since: window.value, language, topic, help: help ? '1' : undefined };

  const since = windowStart(window.days);
  const q = [
    `created:>=${since}`,
    `stars:>=${window.minStars}`,
    language && `language:"${language}"`,
    topic && `topic:${topic}`,
    help && 'help-wanted-issues:>0',
    'archived:false',
  ]
    .filter(Boolean)
    .join(' ');
  const result = await load(q);

  return (
    <>
      <PageHeader
        eyebrow="Discover"
        title="Rising repositories"
        description="Projects created recently that are collecting stars fastest. GitHub has no trending API, so this ranks new repositories by stars: a good place to join early, while issues are fresh and maintainers are close."
      />

      <div className={styles.filters}>
        <Pills label="Time window">
          {WINDOWS.map(w => (
            <PillLink key={w.value} href={href(current, { since: w.value })} active={w.value === window.value}>
              {w.label}
            </PillLink>
          ))}
        </Pills>
        <Pills label="Language" scroll>
          <PillLink href={href(current, { language: undefined })} active={!language}>
            Any language
          </PillLink>
          {LANGUAGES.map(lang => (
            <PillLink key={lang} href={href(current, { language: lang })} active={lang === language}>
              {lang}
            </PillLink>
          ))}
        </Pills>
        <Pills label="Topic" scroll>
          <PillLink href={href(current, { topic: undefined })} active={!topic}>
            All topics
          </PillLink>
          {TOPICS.map(t => (
            <PillLink key={t.value} href={href(current, { topic: t.value })} active={t.value === topic}>
              {t.label}
            </PillLink>
          ))}
          <PillLink href={href(current, { help: help ? undefined : '1' })} active={help}>
            Asking for help
          </PillLink>
        </Pills>
      </div>

      <section aria-labelledby="rising-heading" className={styles.results}>
        <h2 id="rising-heading" className="visually-hidden">
          Results
        </h2>
        {'error' in result ? (
          <Notice tone="warning">{result.error}</Notice>
        ) : result.items.length === 0 ? (
          <EmptyState icon={<IconTrendingUp size={16} />} title="Nothing rising here yet">
            Try a longer time window or another topic.
          </EmptyState>
        ) : (
          <>
            <p className={styles.count}>
              Top {result.items.length} of {result.total.toLocaleString('en-US')} repositories created since{' '}
              {new Date(`${since}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
              , by stars
            </p>
            <ul className={rows.list}>
              {result.items.map(repo => (
                <RepoRow key={repo.id} repo={repo} />
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
