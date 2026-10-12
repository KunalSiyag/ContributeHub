import type { Metadata } from 'next';
import Link from 'next/link';
import { getLeaderboard, type LeaderboardWindow } from '@/lib/leaderboard.server';
import { Avatar, EmptyState, PageHeader, Panel } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/Button';
import { PillLink, Pills } from '@/components/ui/Tabs';
import { IconSearch, IconTrendingUp } from '@/components/icons';
import styles from './leaderboard.module.css';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'Orion members who opted in, ranked by pull requests merged on GitHub this month or all time.',
  alternates: { canonical: '/leaderboard' },
};

const figure = (value: number | null) => (value == null ? '–' : value.toLocaleString('en-US'));

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ window?: string; q?: string }> }) {
  const params = await searchParams;
  const window: LeaderboardWindow = params.window === 'all' ? 'all' : 'month';
  const q = (params.q ?? '').trim().slice(0, 60);
  const { state, entries, allTime } = await getLeaderboard(window === 'all' ? 'all' : 'month');
  const ranked = entries.map((entry, index) => ({ entry, rank: index + 1 }));
  const needle = q.toLowerCase();
  const shown = needle ? ranked.filter(({ entry }) => entry.login.toLowerCase().includes(needle) || entry.name.toLowerCase().includes(needle)) : ranked;
  const href = (patch: { window?: LeaderboardWindow }) => {
    const search = new URLSearchParams();
    if ((patch.window ?? window) === 'all') search.set('window', 'all');
    if (q) search.set('q', q);
    const query = search.toString();
    return query ? `/leaderboard?${query}` : '/leaderboard';
  };

  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="Leaderboard"
        description="Members who chose to appear here, ranked by pull requests merged on GitHub. It counts merged work anywhere on GitHub, so every contribution helps."
        actions={
          <ButtonLink href="/preferences" variant="secondary">
            Join the leaderboard
          </ButtonLink>
        }
      />
      {state !== 'ready' ? (
        <EmptyState icon={<IconTrendingUp size={16} />} title={state === 'unavailable' ? 'The leaderboard is unavailable right now' : 'The leaderboard is being set up'}>
          {state === 'unavailable' ? 'Try again in a moment.' : 'It opens as soon as the database is ready. You can opt in from Preferences then.'}
        </EmptyState>
      ) : entries.length === 0 ? (
        <EmptyState icon={<IconTrendingUp size={16} />} title="Nobody has joined yet">
          Switch on &ldquo;Show me on the leaderboard&rdquo; in <Link href="/preferences">Preferences</Link> to be the first.
        </EmptyState>
      ) : (
        <>
          <div className={styles.controls}>
            {allTime && (
              <Pills label="Period">
                <PillLink href={href({ window: 'month' })} active={window === 'month'}>
                  This month
                </PillLink>
                <PillLink href={href({ window: 'all' })} active={window === 'all'}>
                  All time
                </PillLink>
              </Pills>
            )}
            <form action="/leaderboard" method="get" role="search" className={styles.search}>
              {window === 'all' && <input type="hidden" name="window" value="all" />}
              <IconSearch size={14} aria-hidden="true" />
              <label htmlFor="leaderboard-q" className="visually-hidden">
                Search members
              </label>
              <input id="leaderboard-q" name="q" defaultValue={q} placeholder="Search members…" className={styles.searchInput} />
            </form>
          </div>
          {shown.length === 0 ? (
            <EmptyState icon={<IconSearch size={16} />} title="No members match">
              Try part of a name or GitHub username.
            </EmptyState>
          ) : (
            <Panel className={styles.board}>
              <table className={styles.table}>
                <caption className="visually-hidden">
                  Members ranked by pull requests merged {window === 'all' ? 'all time' : 'in the last 30 days'}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Member</th>
                    <th scope="col" className={styles.num}>
                      Merged, 30 days
                    </th>
                    {allTime && (
                      <>
                        <th scope="col" className={styles.num}>
                          Merged, all time
                        </th>
                        <th scope="col" className={`${styles.num} ${styles.wide}`}>
                          Pull requests
                        </th>
                        <th scope="col" className={`${styles.num} ${styles.wide}`}>
                          Issues
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {shown.map(({ entry, rank }) => (
                    <tr key={entry.login}>
                      <td className={styles.rank}>{rank}</td>
                      <td>
                        <Link href={`/u/${entry.login}`} className={styles.member}>
                          <Avatar src={entry.avatarUrl ?? `https://github.com/${entry.login}.png?size=48`} name={entry.name} size={24} />
                          <span className={styles.who}>
                            <span className={styles.name}>{entry.name}</span>
                            <span className={styles.login}>@{entry.login}</span>
                          </span>
                        </Link>
                      </td>
                      <td className={`${styles.num} ${window === 'month' ? styles.primary : ''}`}>{figure(entry.merged)}</td>
                      {allTime && (
                        <>
                          <td className={`${styles.num} ${window === 'all' ? styles.primary : ''}`}>{figure(entry.mergedAll)}</td>
                          <td className={`${styles.num} ${styles.wide}`}>{figure(entry.pullRequests)}</td>
                          <td className={`${styles.num} ${styles.wide}`}>{figure(entry.issues)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}
        </>
      )}
    </>
  );
}
