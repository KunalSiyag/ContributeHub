'use client';

import Link from 'next/link';
import { Fragment, useCallback, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ISSUE_STATUSES, statusLabel, useWorkspace, type IssueStatus } from '@/contexts/WorkspaceContext';
import { useSkills } from '@/hooks/useSkills';
import { useAsync } from '@/hooks/useAsync';
import { fetchJson } from '@/lib/fetch-json';
import { getUpcomingDeadlines, formatDeadlineDate, type OfficialSchedules } from '@/lib/events';
import type { Issue, Repository } from '@/types';
import { PageHeader, EmptyState, Notice, SectionHead, Skeleton, StatusDot, type StatusTone } from '@/components/ui/primitives';
import { Button, ButtonLink } from '@/components/ui/Button';
import { STATUS_TONE } from '@/components/TrackControl';
import IssueRow, { IssueRowSkeleton } from '@/components/IssueRow';
import RepoRow from '@/components/RepoRow';
import RelativeTime from '@/components/RelativeTime';
import Countdown from '@/components/Countdown';
import SignInGate from '@/components/SignInGate';
import { IconColumns, IconCompass, IconGithub, IconGitMerge, IconGitPullRequest, IconSettings } from '@/components/icons';
import ContributionHeatmap, { type CalendarDay } from './ContributionHeatmap';
import rows from '@/components/rows.module.css';
import styles from './overview.module.css';

interface ActivityItem {
  id: number;
  number: number;
  title: string;
  url: string;
  repo: string;
  state: 'open' | 'closed' | 'merged';
  updatedAt: string;
}

interface ActivityResponse {
  prs: ActivityItem[];
  totals: { openPRs: number | null; mergedPRs: number | null; prs: number };
}

interface CalendarResponse {
  total: number;
  days: CalendarDay[];
}

type RecommendedIssue = Issue & { matchScore: number; matchReasons: string[] };

const PR_TONE: Record<ActivityItem['state'], StatusTone> = { open: 'review', merged: 'done', closed: 'neutral' };
const PR_LABEL: Record<ActivityItem['state'], string> = { open: 'Open', merged: 'Merged', closed: 'Closed' };

/**
 * Loads recommendations only when the section scrolls into view (saves GitHub quota).
 * A callback ref, because the section mounts after auth resolves, not on first render.
 */
function useInView<T extends Element>() {
  const [seen, setSeen] = useState(false);
  const ref = useCallback((el: T | null) => {
    if (!el) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setSeen(true);
        observer.disconnect();
      }
    }, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, seen] as const;
}

export default function OverviewClient({ official }: { official?: OfficialSchedules }) {
  const { user, githubLogin, loading } = useAuth();
  const { ready, issues, repos } = useWorkspace();
  const { skills, hasSkills, ready: skillsReady } = useSkills();
  const [recRef, recVisible] = useInView<HTMLElement>();

  const login = githubLogin ?? undefined;

  const activity = useAsync<ActivityResponse>(login ? `activity:${login}` : null, signal =>
    fetchJson(`/api/github/activity?username=${encodeURIComponent(login!)}`, { signal })
  );
  const calendar = useAsync<CalendarResponse>(login ? `calendar:${login}` : null, signal =>
    fetchJson(`/api/github/contributions?username=${encodeURIComponent(login!)}`, { signal })
  );

  const skillsKey = hasSkills ? JSON.stringify(skills) : null;
  const recommended = useAsync<{ items: RecommendedIssue[]; partial: boolean }>(
    recVisible && skillsKey ? `rec:${skillsKey}` : null,
    signal =>
      fetchJson('/api/issues/recommended', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...skills, languages: skills.languages.slice(0, 2) }),
        signal,
      })
  );

  const counts = useMemo(() => {
    const result: Record<IssueStatus, number> = { saved: 0, ongoing: 0, pr_submitted: 0, completed: 0 };
    for (const issue of issues) result[issue.status] += 1;
    return result;
  }, [issues]);

  const active = useMemo(() => {
    const order: Record<IssueStatus, number> = { pr_submitted: 0, ongoing: 1, saved: 2, completed: 3 };
    return issues
      .filter(issue => issue.status !== 'completed')
      .sort((a, b) => order[a.status] - order[b.status] || b.updated_at.localeCompare(a.updated_at))
      .slice(0, 6);
  }, [issues]);

  const deadlines = useMemo(() => getUpcomingDeadlines(120, new Date(), official).slice(0, 4), [official]);

  if (loading) {
    return (
      <div className={styles.page}>
        <PageHeader eyebrow="Workspace" title="Overview" />
        <Skeleton height={92} radius={6} />
        <div className={styles.grid}>
          <Skeleton height={260} radius={6} />
          <Skeleton height={260} radius={6} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.page}>
        <PageHeader eyebrow="Workspace" title="Overview" description="Your issues, pull requests and deadlines on one page." />
        <SignInGate
          title="Sign in to see your overview"
          description="Sign in once. Orion shows your tracked issues, recent pull requests, contribution calendar and the program deadlines that matter."
          points={['Pipeline of saved, in-progress and merged issues', 'Recent pull requests and merged totals from GitHub', 'Issue recommendations ranked by your skills']}
          next="/dashboard"
        />
      </div>
    );
  }

  const total = issues.length;
  const inProgress = counts.ongoing + counts.pr_submitted;
  const next = deadlines[0];
  // Separators go between the parts that exist (Google accounts may have no handle yet).
  const summary: ReactNode[] = [];
  if (login) summary.push(<span className={styles.login}>@{login}</span>);
  if (ready) summary.push(`${inProgress} in progress`);
  if (next) {
    summary.push(
      <>
        {next.event.shortName} {next.deadline.label.toLowerCase()} in <Countdown date={next.deadline.date} format="days" />
      </>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Workspace"
        title="Overview"
        description={summary.map((part, index) => (
          <Fragment key={index}>
            {index > 0 && ' · '}
            {part}
          </Fragment>
        ))}
        actions={
          <>
            <ButtonLink href="/discover" variant="secondary">
              <IconCompass size={14} />
              Find issues
            </ButtonLink>
            <ButtonLink href="/issues" variant="primary">
              <IconColumns size={14} />
              Open tracker
            </ButtonLink>
          </>
        }
      />

      {/* Pipeline */}
      <section aria-labelledby="pipeline-heading" className={styles.pipeline}>
        <h2 id="pipeline-heading" className="visually-hidden">
          Pipeline
        </h2>
        <ul className={styles.pipelineCells}>
          {ISSUE_STATUSES.map(status => (
            <li key={status.value}>
              <Link href={`/issues?view=list`} className={styles.pipelineCell} data-spotlight="wash">
                <StatusDot tone={STATUS_TONE[status.value]}>{status.label}</StatusDot>
                <span className={styles.pipelineCount}>{ready ? counts[status.value] : '–'}</span>
              </Link>
            </li>
          ))}
        </ul>
        {ready && total > 0 && (
          <div className={styles.pipelineBar} role="img" aria-label={ISSUE_STATUSES.map(s => `${s.label}: ${counts[s.value]}`).join(', ')}>
            {ISSUE_STATUSES.map(status =>
              counts[status.value] > 0 ? (
                <span
                  key={status.value}
                  className={styles.pipelineSegment}
                  data-status={status.value}
                  style={{ flexGrow: counts[status.value] }}
                />
              ) : null
            )}
          </div>
        )}
      </section>

      <div className={styles.grid}>
        {/* In progress */}
        <section aria-labelledby="active-heading">
          <SectionHead title={<span id="active-heading">Continue where you left off</span>} href="/issues" linkLabel="Tracker" />
          {!ready ? (
            <Skeleton height={220} radius={6} />
          ) : active.length === 0 ? (
            <div className={styles.panelEmpty}>
              <EmptyState
                title={total === 0 ? 'Your tracker is empty' : 'Everything you tracked is merged'}
                action={
                  <ButtonLink href="/discover" variant="secondary" size="sm">
                    Find an issue
                  </ButtonLink>
                }
              >
                {total === 0 ? 'Track an issue from Discover and it shows up here.' : 'Nice work. Pick the next one from Discover.'}
              </EmptyState>
            </div>
          ) : (
            <ul className={styles.activeList}>
              {active.map(issue => (
                <li key={issue.id}>
                  <Link href={`/issues/${issue.repo_full_name}/${issue.issue_number}`} className={styles.activeRow}>
                    <StatusDot tone={STATUS_TONE[issue.status]}>
                      <span className="visually-hidden">{statusLabel(issue.status)}</span>
                    </StatusDot>
                    <span className={styles.activeText}>
                      <span className={styles.activeTitle}>{issue.title}</span>
                      <span className={styles.activeMeta}>
                        {issue.repo_full_name} #{issue.issue_number} · {statusLabel(issue.status)}
                      </span>
                    </span>
                    <RelativeTime date={issue.updated_at} className={styles.activeTime} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Deadlines */}
        <section aria-labelledby="deadlines-heading">
          <SectionHead title={<span id="deadlines-heading">Next deadlines</span>} href="/events" linkLabel="Programs" />
          <ul className={styles.deadlineList}>
            {deadlines.map(({ event, deadline }) => (
              <li key={event.slug} data-spotlight="wash">
                <Link href={`/events/${event.slug}`} className={styles.deadlineRow}>
                  <span className={styles.deadlineText}>
                    <span className={styles.deadlineName}>{event.shortName}</span>
                    <span className={styles.deadlineLabel}>
                      {deadline.label} · {formatDeadlineDate(deadline.date)}
                    </span>
                  </span>
                  <Countdown date={deadline.date} className={styles.deadlineTime} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* GitHub activity */}
      <section aria-labelledby="activity-heading" className={styles.section}>
        <SectionHead
          title={<span id="activity-heading">GitHub activity</span>}
          href={login ? `https://github.com/${login}` : undefined}
          linkLabel="Profile"
          external
        />
        {login ? (
          <>
            <div className={styles.activityPanel}>
              <div className={styles.activityStats}>
                <div className={styles.stat}>
                  <span className="eyebrow">Merged pull requests</span>
                  <span className={styles.statValue}>
                    {activity.loading ? <Skeleton width={48} height={20} /> : activity.data?.totals.mergedPRs?.toLocaleString('en-US') ?? '–'}
                  </span>
                  <span className={styles.statCaption}>All time, public repositories</span>
                </div>
                <div className={styles.stat}>
                  <span className="eyebrow">Open pull requests</span>
                  <span className={styles.statValue}>
                    {activity.loading ? <Skeleton width={36} height={20} /> : activity.data?.totals.openPRs?.toLocaleString('en-US') ?? '–'}
                  </span>
                  <span className={styles.statCaption}>Waiting for review or merge</span>
                </div>
              </div>

              <div className={styles.calendarArea}>
                {calendar.loading ? (
                  <Skeleton height={120} radius={6} />
                ) : calendar.data ? (
                  <ContributionHeatmap days={calendar.data.days} total={calendar.data.total} />
                ) : (
                  <p className={styles.muted}>{calendar.error?.message ?? 'Contribution calendar unavailable.'}</p>
                )}
              </div>
            </div>

            <div className={styles.prList}>
              <SectionHead title="Recent pull requests" as="h3" />
              {activity.error ? (
                <Notice
                  tone="warning"
                  action={
                    <Button size="sm" variant="secondary" onClick={activity.reload}>
                      Retry
                    </Button>
                  }
                >
                  {activity.error.message}
                </Notice>
              ) : activity.loading ? (
                <Skeleton height={160} radius={6} />
              ) : activity.data && activity.data.prs.length > 0 ? (
                <ul className={rows.list}>
                  {activity.data.prs.slice(0, 6).map(pr => (
                    <li key={pr.id} className={`${rows.row} ${rows.compact}`}>
                      <div className={rows.main}>
                        <div className={rows.context}>
                          <span className={rows.repo}>{pr.repo}</span>
                          <span className={rows.sep}>·</span>
                          <span className="tabular">#{pr.number}</span>
                          <span className={rows.sep}>·</span>
                          <RelativeTime date={pr.updatedAt} prefix="updated" />
                        </div>
                        <a href={pr.url} target="_blank" rel="noopener noreferrer" className={`${rows.title} ${rows.stretch}`}>
                          {pr.title}
                        </a>
                      </div>
                      <div className={rows.aside}>
                        <StatusDot tone={PR_TONE[pr.state]}>
                          {pr.state === 'merged' ? <IconGitMerge size={12} /> : <IconGitPullRequest size={12} />} {PR_LABEL[pr.state]}
                        </StatusDot>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={styles.panelEmpty}>
                  <EmptyState title="No pull requests yet">Your first one will show up here a few minutes after you open it.</EmptyState>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={styles.panelEmpty}>
            <EmptyState
              icon={<IconGithub size={16} />}
              title="Add your GitHub username"
              action={
                <ButtonLink href="/preferences" variant="secondary" size="sm">
                  Add username
                </ButtonLink>
              }
            >
              Your pull requests and contribution calendar show up here once Orion knows your GitHub handle.
            </EmptyState>
          </div>
        )}
      </section>

      {/* Recommendations */}
      <section aria-labelledby="rec-heading" className={styles.section} ref={recRef}>
        <SectionHead title={<span id="rec-heading">Recommended for you</span>} href="/preferences" linkLabel="Edit skills" />
        {!skillsReady ? (
          <IssueRowSkeleton count={3} />
        ) : !hasSkills ? (
          <div className={styles.panelEmpty}>
            <EmptyState
              icon={<IconSettings size={16} />}
              title="Add your skills to get recommendations"
              action={
                <>
                  <ButtonLink href="/preferences" variant="primary" size="sm">
                    Add skills
                  </ButtonLink>
                  <ButtonLink href="/resume" variant="secondary" size="sm">
                    Import from resume
                  </ButtonLink>
                </>
              }
            >
              Pick your languages and tools once; Orion ranks open issues by how well they fit.
            </EmptyState>
          </div>
        ) : recommended.error ? (
          <Notice
            tone="warning"
            action={
              <Button size="sm" variant="secondary" onClick={recommended.reload}>
                Retry
              </Button>
            }
          >
            {recommended.error.message}
          </Notice>
        ) : !recommended.data ? (
          <IssueRowSkeleton count={4} />
        ) : recommended.data.items.length === 0 ? (
          <div className={styles.panelEmpty}>
            <EmptyState title="No matches right now">Add another language or loosen your experience level in Preferences.</EmptyState>
          </div>
        ) : (
          <ul className={rows.list}>
            {recommended.data.items.slice(0, 5).map(issue => (
              <IssueRow key={issue.id} issue={issue} match={issue.matchScore} matchReasons={issue.matchReasons} />
            ))}
          </ul>
        )}
      </section>

      {/* Saved repositories */}
      {ready && repos.length > 0 && (
        <section aria-labelledby="repos-heading" className={styles.section}>
          <SectionHead
            title={<span id="repos-heading">Saved repositories</span>}
            count={repos.length}
            href="/issues?tab=repos"
            linkLabel="All saved"
          />
          <ul className={rows.list}>
            {repos.slice(0, 3).map(saved => (
              <RepoRow key={saved.id} repo={saved.repo_data as unknown as Repository} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
