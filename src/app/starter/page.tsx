import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchLiveRepos } from '@/lib/github';
import { getStarterProjects, STARTER_SOURCES, starterIssuesUrl, type StarterProject } from '@/lib/starter-projects';
import { formatNumber } from '@/lib/utils';
import RelativeTime from '@/components/RelativeTime';
import SaveRepoButton from '@/components/SaveRepoButton';
import { ButtonAnchor } from '@/components/ui/Button';
import { Avatar, EmptyState, LanguageDot, Notice, PageHeader, Tag } from '@/components/ui/primitives';
import { PillLink, Pills } from '@/components/ui/Tabs';
import { IconArrowUpRight, IconSearch, IconStar } from '@/components/icons';
import rows from '@/components/rows.module.css';
import styles from './starter.module.css';

const description =
  'Open source projects that curate tasks for newcomers, merged from Up For Grabs, goodfirstissue.dev, Awesome for Beginners and For Good First Issue, with live GitHub figures.';

export const metadata: Metadata = {
  title: 'Starter projects',
  description,
  alternates: { canonical: '/starter' },
};

const PER_PAGE = 30;
const SOURCE_KEYS = Object.keys(STARTER_SOURCES) as Array<keyof typeof STARTER_SOURCES>;

type Params = { q?: string; tag?: string; source?: string; page?: string };

function href(current: Params, patch: Partial<Params>) {
  const next = { ...current, ...patch };
  const search = new URLSearchParams();
  if (next.q) search.set('q', next.q);
  if (next.tag) search.set('tag', next.tag);
  if (next.source) search.set('source', next.source);
  if (next.page && next.page !== '1') search.set('page', next.page);
  const query = search.toString();
  return query ? `/starter?${query}` : '/starter';
}

/** The most common tags, as filter chips. */
function topTags(projects: StarterProject[], count: number) {
  const tally = new Map<string, number>();
  for (const project of projects) for (const tag of project.tags) tally.set(tag, (tally.get(tag) ?? 0) + 1);
  return [...tally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, count).map(([tag]) => tag);
}

export default async function StarterPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const raw = await searchParams;
  const all = await getStarterProjects();
  const q = (raw.q ?? '').trim().slice(0, 80);
  const tag = raw.tag?.toLowerCase();
  const source = SOURCE_KEYS.find(key => key === raw.source);
  const current: Params = { q: q || undefined, tag, source };

  const needle = q.toLowerCase();
  const filtered = all.filter(
    project =>
      (!tag || project.tags.includes(tag)) &&
      (!source || project.sources.includes(source)) &&
      (!needle || [project.repo, project.name, project.description, ...project.tags].some(text => text.toLowerCase().includes(needle)))
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(raw.page) || 1));
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const { repos: live, rateLimited } = await fetchLiveRepos(visible.map(project => project.repo));

  return (
    <>
      <PageHeader
        eyebrow="Discover"
        title="Starter projects"
        description="Projects that set aside tasks for newcomers and label them. Merged from four community lists, so each project here has asked for first-time contributors. Pick “social good” for projects working on the UN Sustainable Development Goals."
      />

      <div className={styles.filters}>
        <form action="/starter" method="get" className={styles.search} role="search">
          <IconSearch size={15} aria-hidden="true" />
          <label htmlFor="starter-q" className="visually-hidden">
            Search starter projects
          </label>
          <input id="starter-q" name="q" defaultValue={q} placeholder="Search projects, languages, topics…" className={styles.searchInput} />
          {tag && <input type="hidden" name="tag" value={tag} />}
          {source && <input type="hidden" name="source" value={source} />}
        </form>
        <Pills label="Topic" scroll>
          <PillLink href={href(current, { tag: undefined, page: undefined })} active={!tag}>
            All topics
          </PillLink>
          {topTags(all, 16).map(t => (
            <PillLink key={t} href={href(current, { tag: t, page: undefined })} active={t === tag}>
              {t}
            </PillLink>
          ))}
        </Pills>
        <Pills label="List">
          <PillLink href={href(current, { source: undefined, page: undefined })} active={!source}>
            Every list
          </PillLink>
          {SOURCE_KEYS.map(key => (
            <PillLink key={key} href={href(current, { source: key, page: undefined })} active={key === source}>
              {STARTER_SOURCES[key].name}
            </PillLink>
          ))}
        </Pills>
      </div>

      {rateLimited && <Notice tone="warning">GitHub is rate limiting, so some live figures are missing for now.</Notice>}

      {visible.length === 0 ? (
        <EmptyState icon={<IconSearch size={16} />} title="No starter projects match">
          Try another topic or a shorter search.
        </EmptyState>
      ) : (
        <section aria-labelledby="starter-heading" className={styles.results}>
          <h2 id="starter-heading" className={styles.count}>
            {(page - 1) * PER_PAGE + 1}–{(page - 1) * PER_PAGE + visible.length} of {filtered.length.toLocaleString('en-US')} projects
          </h2>
          <ul className={rows.list}>
            {visible.map(project => {
              const repo = live.get(project.repo.toLowerCase());
              return (
                <li key={project.repo} className={`${rows.row} ${rows.withLead}`} data-spotlight="wash">
                  <Avatar src={repo?.owner.avatar_url ?? `https://github.com/${project.repo.split('/')[0]}.png?size=72`} name={project.repo} size={36} square />
                  <div className={rows.main}>
                    <Link href={`/repos/${project.repo}`} className={`${rows.title} ${rows.stretch}`}>
                      {project.repo}
                    </Link>
                    {(project.description || repo?.description) && (
                      <p className={rows.description}>{project.description || repo?.description}</p>
                    )}
                    <div className={rows.meta}>
                      {repo && <LanguageDot language={repo.language} />}
                      {repo && (
                        <span className={rows.metaItem}>
                          <IconStar size={13} /> {formatNumber(repo.stargazers_count)}
                        </span>
                      )}
                      {repo?.pushed_at && (
                        <span className={rows.metaItem}>
                          <RelativeTime date={repo.pushed_at} prefix="pushed" />
                        </span>
                      )}
                      <span className={rows.metaItem}>via {project.sources.map(s => STARTER_SOURCES[s].name).join(', ')}</span>
                    </div>
                    <div className={rows.tags}>
                      <Tag>{project.label}</Tag>
                      {project.tags.slice(0, 3).map(t => (
                        <Tag key={t} tone="muted">
                          {t}
                        </Tag>
                      ))}
                    </div>
                  </div>
                  <div className={rows.aside}>
                    <ButtonAnchor href={starterIssuesUrl(project)} variant="secondary" size="sm">
                      Starter issues
                      <IconArrowUpRight size={13} />
                    </ButtonAnchor>
                    {repo && <SaveRepoButton repo={repo} />}
                  </div>
                </li>
              );
            })}
          </ul>
          {pages > 1 && (
            <nav className={styles.pager} aria-label="Pages">
              {page > 1 ? <Link href={href(current, { page: String(page - 1) })}>← Previous</Link> : <span />}
              <span className={styles.pageInfo}>
                Page {page} of {pages}
              </span>
              {page < pages ? <Link href={href(current, { page: String(page + 1) })}>Next →</Link> : <span />}
            </nav>
          )}
          <p className={styles.note}>
            Lists by{' '}
            {SOURCE_KEYS.map((key, i) => (
              <span key={key}>
                <a href={STARTER_SOURCES[key].url} target="_blank" rel="noopener noreferrer">
                  {STARTER_SOURCES[key].name}
                </a>
                {i < SOURCE_KEYS.length - 2 ? ', ' : i === SOURCE_KEYS.length - 2 ? ' and ' : ''}
              </span>
            ))}
            , refreshed daily. Projects on several lists come first.
          </p>
        </section>
      )}
    </>
  );
}
