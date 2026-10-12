import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/primitives';
import { computeBountyStats, type BountyIssue } from '@/lib/bounties';
import styles from './page.module.css';

export interface BountySummary {
  /** Sum of every known amount, in USD. */
  totalPool: number;
  count: number;
  unclaimedCount: number;
  /** Bounties with a parsed amount. */
  withAmount: number;
  repos: number;
  largest: BountyIssue | null;
}

export function summarizeBounties(bounties: BountyIssue[]): BountySummary {
  const { totalPool, count, unclaimedCount } = computeBountyStats(bounties);
  let largest: BountyIssue | null = null;
  let withAmount = 0;
  for (const bounty of bounties) {
    if (bounty.bountyValue <= 0) continue;
    withAmount += 1;
    if (!largest || bounty.bountyValue > largest.bountyValue) largest = bounty;
  }
  return {
    totalPool,
    count,
    unclaimedCount,
    withAmount,
    repos: new Set(bounties.map(bounty => bounty.repo)).size,
    largest,
  };
}

const number = (value: number) => value.toLocaleString('en-US');
const money = (value: number) => `$${number(value)}`;

function Stat({
  label,
  value,
  caption,
  loading,
  muted,
}: {
  label: string;
  value: ReactNode;
  caption: ReactNode;
  loading?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={styles.stat}>
      <dt className={`eyebrow ${styles.statLabel}`}>{label}</dt>
      <dd className={[styles.statValue, muted && !loading && styles.statEmpty].filter(Boolean).join(' ')}>
        {loading ? <Skeleton width={72} height={18} className={styles.inlineSkeleton} /> : value}
      </dd>
      <dd className={styles.statCaption}>
        {loading ? <Skeleton width={136} height={10} className={styles.inlineSkeleton} /> : caption}
      </dd>
    </div>
  );
}

interface BountyStatsProps {
  /** Null while loading or when the set could not be loaded. */
  summary: BountySummary | null;
  loading?: boolean;
}

/**
 * Four numbers about the loaded result set, in one panel split by hairlines.
 * Only real figures: anything we cannot compute shows an em dash.
 */
export default function BountyStats({ summary, loading = false }: BountyStatsProps) {
  const unavailable = 'Unavailable';
  const hasAmounts = Boolean(summary && summary.withAmount > 0);
  const largest = summary?.largest ?? null;

  return (
    <dl className={styles.stats} aria-busy={loading || undefined}>
      <Stat
        label="Stated rewards"
        loading={loading}
        muted={!hasAmounts}
        value={summary && hasAmounts ? money(summary.totalPool) : '—'}
        caption={
          !summary ? (
            unavailable
          ) : hasAmounts ? (
            <>
              across <span className={styles.statNumber}>{number(summary.withAmount)}</span>{' '}
              {summary.withAmount === 1 ? 'bounty' : 'bounties'} with an amount
            </>
          ) : (
            'No amounts stated'
          )
        }
      />
      <Stat
        label="Open bounties"
        loading={loading}
        muted={!summary}
        value={summary ? number(summary.count) : '—'}
        caption={
          !summary ? (
            unavailable
          ) : summary.count > 0 ? (
            <>
              across <span className={styles.statNumber}>{number(summary.repos)}</span>{' '}
              {summary.repos === 1 ? 'repository' : 'repositories'}
            </>
          ) : (
            'None for this filter'
          )
        }
      />
      <Stat
        label="Unclaimed"
        loading={loading}
        muted={!summary}
        value={summary ? number(summary.unclaimedCount) : '—'}
        caption={summary ? 'No assignee on GitHub' : unavailable}
      />
      <Stat
        label="Largest"
        loading={loading}
        muted={!largest}
        value={largest ? money(largest.bountyValue) : '—'}
        caption={
          largest ? (
            <a
              className={styles.statRepo}
              href={largest.url}
              target="_blank"
              rel="noopener noreferrer"
              title={largest.title}
              aria-label={`${largest.repo}: ${largest.title} (opens in a new tab)`}
            >
              {largest.repo}
            </a>
          ) : summary ? (
            'No amounts stated'
          ) : (
            unavailable
          )
        }
      />
    </dl>
  );
}
