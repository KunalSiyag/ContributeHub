import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { GitHubError } from '@/lib/github';
import { isGitHubUsername } from '@/lib/identity';
import { getContributionCalendar } from '@/lib/contributions';
import { getPublicProfile, type PublicProfile } from '@/lib/profile';
import { formatNumber } from '@/lib/utils';
import ContributionHeatmap from '@/app/dashboard/ContributionHeatmap';
import RelativeTime from '@/components/RelativeTime';
import { ButtonAnchor } from '@/components/ui/Button';
import { Avatar, EmptyState, LanguageDot, Notice, Panel, SectionHead, Skeleton } from '@/components/ui/primitives';
import { IconArrowLeft, IconArrowUpRight, IconGitPullRequest, IconMapPin } from '@/components/icons';
import rows from '@/components/rows.module.css';
import styles from '../profile.module.css';

export const revalidate = 3600;

type Params = { username: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username} in open source`,
    description: `Merged pull requests and the open source projects ${username} contributes to, from public GitHub data.`,
    // Profiles exist for every GitHub account; keep them out of search indexes.
    robots: { index: false, follow: true },
  };
}

type Loaded = { profile: PublicProfile } | { error: 'missing' | 'limited' | 'unreachable' };

async function load(username: string): Promise<Loaded> {
  try {
    return { profile: await getPublicProfile(username) };
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return { error: 'missing' };
    if (error instanceof GitHubError && error.rateLimited) return { error: 'limited' };
    return { error: 'unreachable' };
  }
}

async function Calendar({ username }: { username: string }) {
  const calendar = await getContributionCalendar(username);
  if (!calendar) return <p className={styles.muted}>The contribution calendar isn&rsquo;t available right now.</p>;
  return <ContributionHeatmap days={calendar.days} total={calendar.total} />;
}

export default async function ProfilePage({ params }: { params: Promise<Params> }) {
  const { username } = await params;
  if (!isGitHubUsername(username)) notFound();
  const loaded = await load(username);
  if ('error' in loaded && loaded.error === 'missing') notFound();
  if ('error' in loaded) {
    return (
      <div className={styles.page}>
        <Notice tone="warning">
          {loaded.error === 'limited' ? 'GitHub is rate limiting requests right now. Try again in a minute.' : 'GitHub could not be reached.'}
        </Notice>
      </div>
    );
  }

  const { profile } = loaded;
  const { user } = profile;
  const external = profile.repositories.reduce((sum, repo) => sum + repo.count, 0);

  return (
    <div className={styles.page}>
      <Link href="/u" className={styles.back}>
        <IconArrowLeft size={14} /> Contributor profiles
      </Link>

      <header className={styles.header}>
        <Avatar src={user.avatarUrl} name={user.login} size={72} />
        <div className={styles.identity}>
          <h1 className={styles.name}>{user.name ?? user.login}</h1>
          <p className={styles.login}>
            @{user.login}
            {user.location && (
              <span className={styles.location}>
                <IconMapPin size={12} /> {user.location}
              </span>
            )}
          </p>
          {user.bio && <p className={styles.bio}>{user.bio}</p>}
        </div>
        <ButtonAnchor href={user.htmlUrl} variant="secondary">
          GitHub profile
          <IconArrowUpRight size={14} />
        </ButtonAnchor>
      </header>

      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt>Merged pull requests</dt>
          <dd>{formatNumber(profile.mergedTotal)}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Merged this year</dt>
          <dd>{profile.mergedThisYear == null ? '–' : formatNumber(profile.mergedThisYear)}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Projects contributed to</dt>
          <dd>{profile.repositories.length}</dd>
        </div>
        <div className={styles.stat}>
          <dt>{profile.hacktoberfest ? `Hacktoberfest ${profile.hacktoberfest.year}` : 'Followers'}</dt>
          <dd>{profile.hacktoberfest ? `${profile.hacktoberfest.count} accepted` : formatNumber(user.followers)}</dd>
        </div>
      </dl>

      <div className={styles.layout}>
        <div className={styles.main}>
          <section aria-labelledby="merged-heading">
            <SectionHead title="Recently merged" id="merged-heading" />
            {profile.recent.length > 0 ? (
              <ul className={rows.list}>
                {profile.recent.map(pull => (
                  <li key={pull.url} className={rows.row} data-spotlight="wash">
                    <div className={rows.main}>
                      <div className={rows.context}>
                        <Link href={`/repos/${pull.repo}`} className={rows.repo}>
                          <span className={rows.repoText}>{pull.repo}</span>
                        </Link>
                      </div>
                      <a href={pull.url} target="_blank" rel="noopener noreferrer" className={rows.title}>
                        {pull.title}
                      </a>
                      <div className={rows.meta}>
                        <span className={rows.metaItem}>
                          <IconGitPullRequest size={13} /> <RelativeTime date={pull.mergedAt} prefix="merged" />
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No merged pull requests yet">
                The first one is the hardest. Find a good first issue in Discover and track it to the finish.
              </EmptyState>
            )}
          </section>

          <section aria-labelledby="calendar-heading">
            <SectionHead title="Contributions in the last year" id="calendar-heading" />
            <Panel className={styles.calendar}>
              <Suspense fallback={<Skeleton height={120} />}>
                <Calendar username={user.login} />
              </Suspense>
            </Panel>
          </section>
        </div>

        <aside className={styles.aside} aria-label="Projects and languages">
          {profile.repositories.length > 0 && (
            <Panel className={styles.sidePanel}>
              <h2 className={styles.sideTitle}>Contributes to</h2>
              <p className={styles.sideNote}>
                {external} of the last {Math.min(profile.mergedTotal, 100)} merged pull requests landed in other people&rsquo;s
                projects.
              </p>
              <ul className={styles.repoList}>
                {profile.repositories.map(repo => (
                  <li key={repo.fullName}>
                    <Link href={`/repos/${repo.fullName}`} className={styles.repoLink}>
                      <span className={styles.repoName}>{repo.fullName}</span>
                      <span className={styles.repoCount}>{repo.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {profile.languages.length > 0 && (
            <Panel className={styles.sidePanel}>
              <h2 className={styles.sideTitle}>Languages in own repositories</h2>
              <ul className={styles.languages}>
                {profile.languages.map(lang => (
                  <li key={lang.name}>
                    <LanguageDot language={lang.name} />
                    <span className={styles.repoCount}>{lang.repos}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <p className={styles.sideNote}>
            On GitHub since {new Date(user.createdAt).getUTCFullYear()} · {formatNumber(user.publicRepos)} public repositories
          </p>
        </aside>
      </div>
    </div>
  );
}
