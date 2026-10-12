import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { describeReset, getIssue, getRepository, GitHubError, type IssueDetail } from '@/lib/github';
import { sanitizeGitHubHtml } from '@/lib/sanitize';
import { isAIAvailable } from '@/lib/gemini';
import { formatNumber } from '@/lib/utils';
import type { Repository } from '@/types';
import { Avatar, LanguageDot, Notice, StatusDot, Tag } from '@/components/ui/primitives';
import { ButtonAnchor, ButtonLink } from '@/components/ui/Button';
import TrackControl from '@/components/TrackControl';
import SaveRepoButton from '@/components/SaveRepoButton';
import RelativeTime from '@/components/RelativeTime';
import {
  IconArrowLeft,
  IconArrowUpRight,
  IconCircleDot,
  IconGitFork,
  IconMessageSquare,
  IconStar,
} from '@/components/icons';
import ApproachPanel from './ApproachPanel';
import styles from './IssueDetail.module.css';

interface Props {
  params: Promise<{ owner: string; repo: string; number: string }>;
}

const NAME = /^[A-Za-z0-9_.-]{1,100}$/;

function parseParams(owner: string, repo: string, number: string) {
  const n = Number(number);
  if (!NAME.test(owner) || !NAME.test(repo) || !Number.isInteger(n) || n < 1 || n > 10_000_000) return null;
  return { owner, repo, number: n };
}

type Loaded =
  | { kind: 'ok'; issue: IssueDetail; repository: Repository | null }
  | { kind: 'unavailable'; message: string };

// Deduplicated between generateMetadata and the page render.
const load = cache(async (owner: string, repo: string, number: number): Promise<Loaded> => {
  const [issueResult, repoResult] = await Promise.allSettled([getIssue(owner, repo, number), getRepository(owner, repo)]);

  if (issueResult.status === 'rejected') {
    const err = issueResult.reason;
    if (err instanceof GitHubError && err.status === 404) notFound();
    const message =
      err instanceof GitHubError && err.rateLimited
        ? `GitHub's rate limit was reached, so this issue can't be loaded right now. Try again ${describeReset(err.resetAt)}.`
        : 'GitHub is not responding right now. Try again shortly.';
    return { kind: 'unavailable', message };
  }

  return { kind: 'ok', issue: issueResult.value, repository: repoResult.status === 'fulfilled' ? repoResult.value : null };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const raw = await params;
  const parsed = parseParams(raw.owner, raw.repo, raw.number);
  if (!parsed) return { title: 'Issue not found' };
  const data = await load(parsed.owner, parsed.repo, parsed.number);
  const ref = `${parsed.owner}/${parsed.repo}#${parsed.number}`;
  if (data.kind !== 'ok') return { title: ref };
  return {
    title: `${data.issue.title} · ${ref}`,
    description: (data.issue.body_text || data.issue.body || '').replace(/\s+/g, ' ').slice(0, 160) || `Open issue in ${parsed.owner}/${parsed.repo}.`,
    robots: { index: false },
  };
}

export default async function IssuePage({ params }: Props) {
  const raw = await params;
  const parsed = parseParams(raw.owner, raw.repo, raw.number);
  if (!parsed) notFound();

  const { owner, repo, number } = parsed;
  const githubUrl = `https://github.com/${owner}/${repo}/issues/${number}`;
  const [data, aiEnabled] = await Promise.all([load(owner, repo, number), isAIAvailable()]);

  const back = (
    <Link href="/discover" className={styles.back}>
      <IconArrowLeft size={14} /> Discover
    </Link>
  );

  if (data.kind === 'unavailable') {
    return (
      <div className={styles.page}>
        {back}
        <h1 className={styles.title}>
          {owner}/{repo}#{number}
        </h1>
        <Notice tone="warning" title="Issue unavailable">
          {data.message}
        </Notice>
        <div>
          <ButtonAnchor href={githubUrl} variant="secondary">
            Open on GitHub <IconArrowUpRight size={13} />
          </ButtonAnchor>
        </div>
      </div>
    );
  }

  const { issue, repository } = data;
  const fullName = `${owner}/${repo}`;
  const isPullRequest = Boolean(issue.pull_request);
  const open = issue.state === 'open';
  const assignees = issue.assignees ?? [];
  const bodyHtml = issue.body_html ? sanitizeGitHubHtml(issue.body_html) : '';
  const labels = issue.labels ?? [];

  return (
    <div className={styles.page}>
      {back}

      <header className={styles.header}>
        <div className={styles.context}>
          <a href={`https://github.com/${fullName}`} target="_blank" rel="noopener noreferrer" className={styles.repo}>
            <Avatar src={repository?.owner.avatar_url ?? `https://github.com/${owner}.png?size=40`} name={owner} size={18} square />
            {fullName}
          </a>
          <span className={styles.sep}>·</span>
          <span className="tabular">#{number}</span>
          <span className={styles.sep}>·</span>
          <span>
            opened <RelativeTime date={issue.created_at} /> by{' '}
            <a href={issue.user.html_url} target="_blank" rel="noopener noreferrer" className={styles.author}>
              @{issue.user.login}
            </a>
          </span>
        </div>

        <h1 className={styles.title}>{issue.title}</h1>

        <div className={styles.statusRow}>
          <StatusDot tone={open ? 'done' : 'neutral'} live={open}>
            {isPullRequest ? 'Pull request' : open ? 'Open' : issue.state_reason === 'completed' ? 'Closed as completed' : 'Closed'}
          </StatusDot>
          <span className={styles.meta}>
            <IconMessageSquare size={13} /> {issue.comments} {issue.comments === 1 ? 'comment' : 'comments'}
          </span>
          <span className={styles.meta}>
            Updated <RelativeTime date={issue.updated_at} />
          </span>
          {labels.length > 0 && (
            <span className={styles.labels}>
              {labels.map(label => (
                <Tag key={label.id ?? label.name} dot={label.color ? `#${label.color}` : undefined} title={label.description ?? undefined}>
                  {label.name}
                </Tag>
              ))}
            </span>
          )}
        </div>

        <div className={styles.actions}>
          {!isPullRequest && (
            <TrackControl
              size="md"
              issue={{
                url: issue.html_url,
                number,
                repo: fullName,
                title: issue.title,
                description: issue.body,
                labels: labels.map(label => label.name),
              }}
            />
          )}
          <ButtonAnchor href={issue.html_url} variant="secondary">
            Open on GitHub <IconArrowUpRight size={13} />
          </ButtonAnchor>
        </div>
      </header>

      {isPullRequest ? (
        <Notice title="This is a pull request">
          Orion tracks issues. Open it on GitHub to follow the review.
        </Notice>
      ) : (
        !open && (
          <Notice tone="warning" title="This issue is closed">
            It may already be fixed. Check the discussion on GitHub before starting work.
          </Notice>
        )
      )}
      {open && assignees.length > 0 && (
        <Notice tone="warning" title={`Assigned to ${assignees.map(a => `@${a.login}`).join(', ')}`}>
          Someone is already on this. Ask in the comments before you start, or pick another issue.
        </Notice>
      )}

      <div className={styles.layout}>
        <div className={styles.main}>
          <section aria-label="Issue description" className={styles.bodyPanel}>
            {bodyHtml ? (
              <div className={styles.prose} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            ) : (
              <p className={styles.emptyBody}>No description provided.</p>
            )}
          </section>

          {!isPullRequest && open && (
            <ApproachPanel
              aiEnabled={aiEnabled}
              issue={{ title: issue.title, body: (issue.body ?? '').slice(0, 3000), labels: labels.map(l => l.name), repo: fullName }}
            />
          )}

          {!isPullRequest && (
            <section aria-labelledby="start-heading" className={styles.checklist}>
              <h2 id="start-heading" className={styles.sectionTitle}>
                Before you start
              </h2>
              <ol>
                <li>
                  <strong>Read the contributing guide.</strong> Most projects keep it in CONTRIBUTING.md; it covers setup, style and how
                  to submit.
                </li>
                <li>
                  <strong>Comment on the issue.</strong> Say how you plan to fix it and ask to be assigned. Wait for a maintainer if the
                  project asks you to.
                </li>
                <li>
                  <strong>Fork, branch, and reproduce.</strong> Confirm the problem locally before changing code.
                </li>
                <li>
                  <strong>Open a focused pull request.</strong> Reference the issue with{' '}
                  <code>Fixes #{number}</code> so it closes on merge.
                </li>
                <li>
                  <strong>Move it along in your tracker.</strong> Working on it, then PR open, then merged.
                </li>
              </ol>
            </section>
          )}
        </div>

        <aside className={styles.aside} aria-label="Repository">
          <div className={styles.repoPanel}>
            <div className={styles.repoHead}>
              <Avatar src={repository?.owner.avatar_url ?? `https://github.com/${owner}.png?size=72`} name={owner} size={32} square />
              <div className={styles.repoName}>
                <a href={`https://github.com/${fullName}`} target="_blank" rel="noopener noreferrer">
                  {fullName}
                </a>
                {repository?.license?.spdx_id && repository.license.spdx_id !== 'NOASSERTION' && (
                  <span className={styles.license}>{repository.license.spdx_id}</span>
                )}
              </div>
            </div>
            {repository?.description && <p className={styles.repoDescription}>{repository.description}</p>}
            {repository && (
              <dl className={styles.repoStats}>
                <div>
                  <dt>Language</dt>
                  <dd>{repository.language ? <LanguageDot language={repository.language} /> : '—'}</dd>
                </div>
                <div>
                  <dt>Stars</dt>
                  <dd>
                    <IconStar size={12} /> {formatNumber(repository.stargazers_count)}
                  </dd>
                </div>
                <div>
                  <dt>Forks</dt>
                  <dd>
                    <IconGitFork size={12} /> {formatNumber(repository.forks_count)}
                  </dd>
                </div>
                <div>
                  <dt>Open issues</dt>
                  <dd>
                    <IconCircleDot size={12} /> {formatNumber(repository.open_issues_count)}
                  </dd>
                </div>
                <div>
                  <dt>Last push</dt>
                  <dd>
                    <RelativeTime date={repository.pushed_at} />
                  </dd>
                </div>
              </dl>
            )}
            <div className={styles.repoActions}>
              {repository && <SaveRepoButton repo={repository} label />}
              <ButtonLink href={`/repos/${fullName}`} variant="ghost" size="sm">
                Repository report
              </ButtonLink>
              <ButtonAnchor
                href={`https://github.com/${fullName}/issues?q=${encodeURIComponent('is:issue is:open label:"good first issue"')}`}
                variant="ghost"
                size="sm"
              >
                More good first issues <IconArrowUpRight size={12} />
              </ButtonAnchor>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
