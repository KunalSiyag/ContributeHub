import type { Metadata } from 'next';
import { Suspense } from 'react';
import { fetchBounties } from '@/lib/bounties.server';
import { GitHubError, describeReset } from '@/lib/github';
import BountiesClient from './BountiesClient';
import BountiesHeader from './BountiesHeader';
import BountiesSkeleton from './BountiesSkeleton';
import { BOUNTY_LIMIT, type BountyLoadError, type BountySet } from './types';
import styles from './page.module.css';

export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'Bounties',
  description:
    'Open GitHub issues with a stated reward, from bounty labels and Algora. Filter by language and source, and skip work someone already holds.',
};

async function loadInitial(): Promise<{ initial: BountySet | null; error: BountyLoadError | null }> {
  try {
    const { bounties, partial } = await fetchBounties({ limit: BOUNTY_LIMIT });
    return { initial: { bounties, partial }, error: null };
  } catch (err) {
    if (err instanceof GitHubError && err.rateLimited) {
      return {
        initial: null,
        error: {
          message: `GitHub's rate limit was reached. Bounties return ${describeReset(err.resetAt)}.`,
          resetAt: err.resetAt,
        },
      };
    }
    if (!(err instanceof GitHubError)) console.error(err);
    return { initial: null, error: { message: 'GitHub is not responding right now. Try again shortly.' } };
  }
}

export default async function BountiesPage() {
  const { initial, error } = await loadInitial();

  return (
    <>
      <BountiesHeader />
      {/* useSearchParams in the client needs a boundary to keep this page static. */}
      <Suspense fallback={<BountiesSkeleton />}>
        <BountiesClient initial={initial} initialError={error} />
      </Suspense>
      <section className={styles.claim} aria-labelledby="claim-heading">
        <h2 id="claim-heading" className={styles.claimTitle}>
          How to claim
        </h2>
        <div className={styles.claimGrid}>
          <div className={styles.claimCard}>
            <span className="eyebrow">Algora bounties</span>
            <ol className={styles.claimSteps}>
              <li>Ask to work on it in a comment, following any steps the issue lists (some projects want a sign-up first).</li>
              <li>
                Open a pull request that links the issue and includes <code>/claim #issue-number</code> in its description.
              </li>
              <li>Connect Stripe on Algora; it pays out once the maintainer merges and confirms the work.</li>
            </ol>
            <a href="https://algora.io" target="_blank" rel="noopener noreferrer" className={styles.claimLink}>
              Algora
            </a>
          </div>
          <div className={styles.claimCard}>
            <span className="eyebrow">Bounty labels on GitHub</span>
            <ol className={styles.claimSteps}>
              <li>Read the issue for who pays, how and when: the label alone doesn&rsquo;t say.</li>
              <li>Ask in a comment whether the bounty is still open before you start.</li>
              <li>Reference the issue in your pull request and follow up with the maintainer after it merges.</li>
            </ol>
          </div>
        </div>
      </section>
      <p className={styles.footnote}>
        Amounts are parsed from labels and issue text. Check the issue for payout terms before you start.
      </p>
    </>
  );
}
