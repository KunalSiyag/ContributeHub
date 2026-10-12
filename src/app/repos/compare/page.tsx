import type { Metadata } from 'next';
import Link from 'next/link';
import { GitHubError } from '@/lib/github';
import { getRepoHealth, healthChecks, healthScore, type RepoHealth } from '@/lib/repo-health';
import { formatNumber } from '@/lib/utils';
import { buttonClass } from '@/components/ui/Button';
import { Notice, PageHeader, Panel } from '@/components/ui/primitives';
import { IconArrowLeft, IconArrowRight, IconCheck, IconX } from '@/components/icons';
import { parseRepoInput } from '../repo-input';
import styles from '../repos.module.css';

export const metadata: Metadata = {
  title: 'Compare repositories',
  description: 'Two open source repositories side by side: how welcoming each is to contributors, how fast they review, and how active they are.',
  alternates: { canonical: '/repos/compare' },
};

type Side = { name: string; health: RepoHealth } | { name: string; error: string };

async function load(input: string | undefined): Promise<Side | null> {
  const parsed = input ? parseRepoInput(input) : null;
  if (!parsed) return null;
  const name = `${parsed.owner}/${parsed.repo}`;
  try {
    return { name, health: await getRepoHealth(parsed.owner, parsed.repo) };
  } catch (error) {
    const message =
      error instanceof GitHubError && error.status === 404
        ? 'Not found on GitHub.'
        : error instanceof GitHubError && error.rateLimited
          ? 'GitHub is rate limiting; try again in a minute.'
          : 'GitHub could not be reached.';
    return { name, error: message };
  }
}

const hours = (h: number | null | undefined) => (h == null ? '–' : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} days`);

function rowsFor(health: RepoHealth) {
  const checks = healthChecks(health);
  return {
    score: healthScore(checks),
    checks,
    figures: [
      ['Stars', formatNumber(health.repo.stargazers_count)],
      ['Open issues and pull requests', formatNumber(health.repo.open_issues_count)],
      ['Median time to merge', hours(health.pulls?.medianMergeHours)],
      [
        'Recent pull requests merged',
        health.pulls && health.pulls.closedRecently ? `${Math.round((health.pulls.mergedRecently / health.pulls.closedRecently) * 100)}%` : '–',
      ],
      ['Median time to close an issue', health.issues.medianCloseDays == null ? '–' : hours(health.issues.medianCloseDays * 24)],
      ['Unassigned good first issues', health.issues.goodFirstUnassigned == null ? '–' : String(health.issues.goodFirstUnassigned)],
      ['Commits in the last four weeks', health.weeklyCommits ? String(health.weeklyCommits.slice(-4).reduce((a, b) => a + b, 0)) : '–'],
      ['Top contributor’s share', health.topContributorShare == null ? '–' : `${Math.round(health.topContributorShare * 100)}%`],
      ['Main language', health.languages[0]?.name ?? '–'],
    ] as Array<[string, string]>,
  };
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { a, b } = await searchParams;
  const [left, right] = await Promise.all([load(a), load(b)]);
  const ready = left && right && 'health' in left && 'health' in right;
  const L = ready ? rowsFor(left.health) : null;
  const R = ready ? rowsFor(right.health) : null;

  return (
    <div className={styles.page}>
      <Link href="/repos" className={styles.back}>
        <IconArrowLeft size={14} /> Repository report
      </Link>
      <PageHeader
        eyebrow="Discover"
        title="Compare repositories"
        description="Choosing between two projects to contribute to? See which one reviews faster, merges more outside work and has issues ready for you."
      />
      <Panel className={styles.lookup}>
        <form action="/repos/compare" method="get" className={styles.compareForm}>
          {(['a', 'b'] as const).map((key, i) => (
            <div key={key} className={styles.lookupForm}>
              <label htmlFor={`compare-${key}`} className={styles.lookupLabel}>
                {i === 0 ? 'First repository' : 'Second repository'}
              </label>
              <span className={styles.lookupField}>
                <input
                  id={`compare-${key}`}
                  name={key}
                  defaultValue={key === 'a' ? a : b}
                  placeholder={i === 0 ? 'e.g. vuejs/core' : 'e.g. sveltejs/svelte'}
                  autoComplete="off"
                  spellCheck={false}
                  required
                  className={styles.lookupInput}
                />
              </span>
            </div>
          ))}
          <button type="submit" className={buttonClass({ variant: 'primary' })}>
            Compare
            <IconArrowRight size={14} />
          </button>
        </form>
      </Panel>

      {[left, right].map(side => side && 'error' in side && <Notice key={side.name} tone="warning">{`${side.name}: ${side.error}`}</Notice>)}

      {ready && L && R && (
        <Panel className={styles.compareTable}>
          <table className={styles.compare}>
            <thead>
              <tr>
                <th scope="col">
                  <span className="visually-hidden">Measure</span>
                </th>
                {[left, right].map(side => (
                  <th key={side.name} scope="col">
                    <Link href={`/repos/${side.name}`}>{side.name}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Contributor score</th>
                <td className={styles.compareScore}>{L.score ?? '–'}</td>
                <td className={styles.compareScore}>{R.score ?? '–'}</td>
              </tr>
              {L.checks.map((check, i) => (
                <tr key={check.id}>
                  <th scope="row">{check.label}</th>
                  {[check, R.checks[i]].map((c, j) => (
                    <td key={j} title={c.detail}>
                      <span className={styles.compareMark} data-state={c.ok === null ? 'unknown' : c.ok ? 'ok' : 'missing'}>
                        {c.ok === null ? '–' : c.ok ? <IconCheck size={13} /> : <IconX size={13} />}
                        <span className="visually-hidden">{c.ok === null ? 'unknown' : c.ok ? 'yes' : 'no'}</span>
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
              {L.figures.map(([label, value], i) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td>{value}</td>
                  <td>{R.figures[i][1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
