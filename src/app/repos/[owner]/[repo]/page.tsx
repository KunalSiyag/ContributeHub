import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { GitHubError, searchIssues } from '@/lib/github';
import { isAIAvailable } from '@/lib/gemini';
import { getRepoHealth, healthChecks, healthScore, type HealthCheck, type RepoHealth } from '@/lib/repo-health';
import { formatNumber } from '@/lib/utils';
import IssueRow, { IssueRowSkeleton } from '@/components/IssueRow';
import RelativeTime from '@/components/RelativeTime';
import SaveRepoButton from '@/components/SaveRepoButton';
import { ButtonAnchor, ButtonLink } from '@/components/ui/Button';
import { Avatar, EmptyState, LanguageDot, Notice, Panel, SectionHead, StatusDot } from '@/components/ui/primitives';
import {
  IconArrowLeft,
  IconArrowUpRight,
  IconCheck,
  IconCircleDot,
  IconGitFork,
  IconSparkles,
  IconStar,
  IconX,
} from '@/components/icons';
import rows from '@/components/rows.module.css';
import styles from '../../repos.module.css';

export const revalidate = 3600;

type Params = { owner: string; repo: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { owner, repo } = await params;
  const name = `${owner}/${repo}`;
  return {
    title: `${name}: repository report`,
    description: `Is ${name} a good place to contribute? Maintainers, review speed, activity and good first issues, from public GitHub data.`,
    alternates: { canonical: `/repos/${name}` },
  };
}

function verdict(score: number): { tone: 'done' | 'working' | 'danger'; label: string } {
  if (score >= 70) return { tone: 'done', label: 'Welcoming to new contributors' };
  if (score >= 40) return { tone: 'working', label: 'Mixed signals' };
  return { tone: 'danger', label: 'Hard to contribute to' };
}

function duration(hours: number | null): string {
  if (hours == null) return '–';
  if (hours < 1) return 'under an hour';
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} days`;
}

function CheckRow({ check }: { check: HealthCheck }) {
  return (
    <li className={styles.check} data-state={check.ok === null ? 'unknown' : check.ok ? 'ok' : 'missing'}>
      <span className={styles.checkIcon} aria-hidden="true">
        {check.ok === null ? '–' : check.ok ? <IconCheck size={13} /> : <IconX size={13} />}
      </span>
      <span className={styles.checkText}>
        <span className={styles.checkLabel}>
          {check.label}
          <span className="visually-hidden">: {check.ok === null ? 'unknown' : check.ok ? 'yes' : 'no'}</span>
        </span>
        <span className={styles.checkDetail}>{check.detail}</span>
      </span>
    </li>
  );
}

/** A year of weekly commits as bars; the label carries the numbers for screen readers. */
function CommitBars({ weeks }: { weeks: number[] }) {
  const peak = Math.max(...weeks, 1);
  const total = weeks.reduce((a, b) => a + b, 0);
  const now = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  return (
    <figure className={styles.bars} aria-label={`${total.toLocaleString('en-US')} commits in the last 52 weeks; busiest week ${peak}.`}>
      <div className={styles.barTrack} role="img" aria-hidden="true">
        {weeks.map((count, index) => {
          const weekStart = new Date(now - (weeks.length - index) * 7 * 86_400_000);
          return (
            <span
              key={index}
              className={styles.bar}
              style={{ height: `${Math.max(count ? 6 : 2, (count / peak) * 100)}%` }}
              data-empty={count === 0 || undefined}
              title={`Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}: ${count} commit${count === 1 ? '' : 's'}`}
            />
          );
        })}
      </div>
      <figcaption className={styles.barCaption}>
        <span>52 weeks ago</span>
        <span>{total.toLocaleString('en-US')} commits</span>
        <span>This week</span>
      </figcaption>
    </figure>
  );
}

async function GoodFirstIssues({ fullName }: { fullName: string }) {
  let items;
  try {
    ({ items } = await searchIssues(`repo:${fullName} is:issue is:open label:"good first issue" no:assignee`, {
      sort: 'created',
      perPage: 6,
      revalidate: 900,
    }));
  } catch (error) {
    const limited = error instanceof GitHubError && error.rateLimited;
    items = null;
    if (limited) return <Notice tone="warning">GitHub is rate limiting searches. Try again in a minute.</Notice>;
  }
  if (!items) return <Notice tone="warning">GitHub could not be reached.</Notice>;
  if (items.length === 0) {
    return <EmptyState title="No unassigned good first issues right now">Check back, or look at help-wanted issues on GitHub.</EmptyState>;
  }
  return (
    <ul className={rows.list}>
      {items.map(issue => (
        <IssueRow key={issue.id} issue={issue} compact />
      ))}
    </ul>
  );
}

type Loaded = { health: RepoHealth } | { error: 'missing' | 'limited' | 'unreachable' };

async function load(owner: string, repo: string): Promise<Loaded> {
  try {
    return { health: await getRepoHealth(owner, repo) };
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return { error: 'missing' };
    if (error instanceof GitHubError && error.rateLimited) return { error: 'limited' };
    return { error: 'unreachable' };
  }
}

export default async function RepoReportPage({ params }: { params: Promise<Params> }) {
  const { owner, repo } = await params;
  const [loaded, aiAvailable] = await Promise.all([load(owner, repo), isAIAvailable()]);
  if ('error' in loaded && loaded.error === 'missing') notFound();
  if ('error' in loaded) {
    return (
      <div className={styles.page}>
        <Link href="/repos" className={styles.back}>
          <IconArrowLeft size={14} /> Repository report
        </Link>
        <Notice tone="warning">
          {loaded.error === 'limited'
            ? 'GitHub is rate limiting requests right now. Try again in a minute.'
            : 'GitHub could not be reached. Try again shortly.'}
        </Notice>
      </div>
    );
  }

  const { health } = loaded;
  const { repo: data } = health;
  const checks = healthChecks(health);
  const score = healthScore(checks);
  const passed = checks.filter(check => check.ok).length;
  const judged = checks.filter(check => check.ok !== null).length;

  return (
    <div className={styles.page}>
      <Link href="/repos" className={styles.back}>
        <IconArrowLeft size={14} /> Repository report
      </Link>

      <header className={styles.header}>
        <Avatar src={data.owner.avatar_url} name={data.owner.login} size={48} square />
        <div className={styles.headerText}>
          <h1 className={styles.title}>{data.full_name}</h1>
          {data.description && <p className={styles.description}>{data.description}</p>}
          <div className={rows.meta}>
            <LanguageDot language={data.language} />
            <span className={rows.metaItem}>
              <IconStar size={13} /> {formatNumber(data.stargazers_count)}
            </span>
            <span className={rows.metaItem}>
              <IconGitFork size={13} /> {formatNumber(data.forks_count)}
            </span>
            <span className={rows.metaItem}>
              <IconCircleDot size={13} /> {formatNumber(data.open_issues_count)} open
            </span>
            <span className={rows.metaItem}>
              <RelativeTime date={data.pushed_at} prefix="pushed" />
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <SaveRepoButton repo={data} label />
          {aiAvailable && (
            <ButtonLink href={`/assistant?repo=${encodeURIComponent(data.full_name)}`} variant="secondary">
              <IconSparkles size={14} />
              Explain with AI
            </ButtonLink>
          )}
          <ButtonLink href={`/repos/compare?a=${encodeURIComponent(data.full_name)}`} variant="secondary">
            Compare
          </ButtonLink>
          <ButtonAnchor href={data.html_url} variant="secondary">
            Open on GitHub
            <IconArrowUpRight size={14} />
          </ButtonAnchor>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.main}>
          <section aria-labelledby="score-heading">
            <SectionHead title="Contributor checklist" id="score-heading" />
            <Panel className={styles.scorePanel}>
              <div className={styles.score}>
                {score !== null ? (
                  <>
                    <span className={styles.scoreValue}>
                      {score}
                      <span className={styles.scoreOutOf}>/100</span>
                    </span>
                    <StatusDot tone={verdict(score).tone} className={styles.verdict}>
                      {verdict(score).label}
                    </StatusDot>
                    <span className={styles.scoreNote}>
                      {passed} of {judged} checks pass
                    </span>
                  </>
                ) : (
                  <span className={styles.scoreNote}>Not enough public data to score this repository.</span>
                )}
              </div>
              <ul className={styles.checks}>
                {checks.map(check => (
                  <CheckRow key={check.id} check={check} />
                ))}
              </ul>
            </Panel>
          </section>

          <section aria-labelledby="activity-heading">
            <SectionHead title="Commit activity" id="activity-heading" />
            <Panel className={styles.activityPanel}>
              {health.weeklyCommits ? (
                <CommitBars weeks={health.weeklyCommits} />
              ) : (
                <p className={styles.muted}>GitHub is still computing this repository&rsquo;s activity. Refresh in a minute.</p>
              )}
            </Panel>
          </section>

          <section aria-labelledby="gfi-heading">
            <SectionHead
              title="Good first issues"
              id="gfi-heading"
              href={`https://github.com/${data.full_name}/issues?q=${encodeURIComponent('is:issue is:open label:"good first issue"')}`}
              linkLabel="All on GitHub"
              external
            />
            <Suspense fallback={<IssueRowSkeleton count={3} />}>
              <GoodFirstIssues fullName={data.full_name} />
            </Suspense>
          </section>
        </div>

        <aside className={styles.aside} aria-label="Repository figures">
          <Panel className={styles.figures}>
            <dl className={styles.figureList}>
              <div className={styles.figure}>
                <dt>Median time to merge</dt>
                <dd>{duration(health.pulls?.medianMergeHours ?? null)}</dd>
              </div>
              <div className={styles.figure}>
                <dt>Recently closed pull requests merged</dt>
                <dd>
                  {health.pulls && health.pulls.closedRecently > 0
                    ? `${Math.round((health.pulls.mergedRecently / health.pulls.closedRecently) * 100)}%`
                    : '–'}
                </dd>
              </div>
              <div className={styles.figure}>
                <dt>Median time to close an issue</dt>
                <dd>{health.issues.medianCloseDays == null ? '–' : duration(health.issues.medianCloseDays * 24)}</dd>
              </div>
              <div className={styles.figure}>
                <dt>Good first issues (unassigned)</dt>
                <dd>
                  {health.issues.goodFirst == null
                    ? '–'
                    : `${health.issues.goodFirst.toLocaleString('en-US')} (${(health.issues.goodFirstUnassigned ?? 0).toLocaleString('en-US')})`}
                </dd>
              </div>
              <div className={styles.figure}>
                <dt>Help wanted</dt>
                <dd>{health.issues.helpWanted == null ? '–' : health.issues.helpWanted.toLocaleString('en-US')}</dd>
              </div>
              <div className={styles.figure}>
                <dt>GitHub community profile</dt>
                <dd>{health.communityScore == null ? '–' : `${health.communityScore}%`}</dd>
              </div>
            </dl>
          </Panel>

          {health.languages.length > 0 && (
            <Panel className={styles.sidePanel}>
              <h2 className={styles.sideTitle}>Languages</h2>
              <ul className={styles.languages}>
                {health.languages.slice(0, 6).map(lang => (
                  <li key={lang.name} className={styles.language}>
                    <LanguageDot language={lang.name} />
                    <span className={styles.languageShare}>{(lang.share * 100).toFixed(lang.share < 0.1 ? 1 : 0)}%</span>
                    <span className={styles.languageBar} aria-hidden="true">
                      <span style={{ width: `${Math.max(lang.share * 100, 1)}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {health.contributors.length > 0 && (
            <Panel className={styles.sidePanel}>
              <h2 className={styles.sideTitle}>Top contributors</h2>
              <ul className={styles.people}>
                {health.contributors.slice(0, 8).map(person => (
                  <li key={person.login}>
                    <Link href={`/u/${person.login}`} className={styles.person}>
                      <Avatar src={person.avatarUrl} name={person.login} size={20} />
                      <span className={styles.personName}>{person.login}</span>
                      <span className={styles.personCount}>{formatNumber(person.contributions)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel className={styles.sidePanel}>
            <h2 className={styles.sideTitle}>Maintain this repository?</h2>
            <ul className={styles.maintainerLinks}>
              <li>
                <Link href={`/repo-bot?repo=${encodeURIComponent(health.repo.full_name)}`}>Welcome first-time contributors with the repo bot</Link>
              </li>
              <li>
                Label starter tasks <code>good first issue</code>: Discover, alerts and the MCP server find them automatically.
              </li>
              <li>
                Get listed on{' '}
                <a href="https://github.com/up-for-grabs/up-for-grabs.net/blob/gh-pages/docs/list-a-project.md" target="_blank" rel="noopener noreferrer">
                  Up For Grabs
                </a>{' '}
                or{' '}
                <a href="https://github.com/deepsourcelabs/good-first-issue#adding-a-new-project" target="_blank" rel="noopener noreferrer">
                  goodfirstissue.dev
                </a>
                , or{' '}
                <a href="https://github.com/github/forgoodfirstissue#adding-a-new-project" target="_blank" rel="noopener noreferrer">
                  For Good First Issue
                </a>{' '}
                for social-impact projects; Orion’s starter projects pick them up within a day.
              </li>
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
