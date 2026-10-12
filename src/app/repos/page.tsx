import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Notice, PageHeader, Panel } from '@/components/ui/primitives';
import { buttonClass } from '@/components/ui/Button';
import { IconArrowRight, IconSearch } from '@/components/icons';
import { parseRepoInput } from './repo-input';
import styles from './repos.module.css';

const description =
  'Check whether an open source repository is a good place to contribute: maintainers, review speed, activity, good first issues and community files.';

export const metadata: Metadata = {
  title: 'Repository report',
  description,
  alternates: { canonical: '/repos' },
};

const EXAMPLES = ['freeCodeCamp/freeCodeCamp', 'excalidraw/excalidraw', 'zulip/zulip', 'appwrite/appwrite', 'mermaid-js/mermaid'];

export default async function ReposPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { repo: input } = await searchParams;
  const parsed = input ? parseRepoInput(input) : null;
  if (parsed) redirect(`/repos/${parsed.owner}/${parsed.repo}`);

  return (
    <>
      <PageHeader
        eyebrow="Discover"
        title="Repository report"
        description="Before you spend a weekend on an issue, see whether the project merges outside contributions, how fast it reviews them and who keeps it alive."
      />
      <Panel className={styles.lookup}>
        <form action="/repos" method="get" className={styles.lookupForm} role="search">
          <label htmlFor="repo-input" className={styles.lookupLabel}>
            GitHub repository
          </label>
          <div className={styles.lookupRow}>
            <span className={styles.lookupField}>
              <IconSearch size={15} aria-hidden="true" />
              <input
                id="repo-input"
                name="repo"
                defaultValue={input}
                placeholder="owner/repo or a GitHub link"
                autoComplete="off"
                spellCheck={false}
                required
                className={styles.lookupInput}
              />
            </span>
            <button type="submit" className={buttonClass({ variant: 'primary' })}>
              Get report
              <IconArrowRight size={14} />
            </button>
          </div>
        </form>
        {input && !parsed && <Notice tone="warning">That doesn&rsquo;t look like a repository. Try owner/repo, e.g. zulip/zulip.</Notice>}
        <p className={styles.examples}>
          Deciding between two? <Link href="/repos/compare">Compare repositories</Link>.
        </p>
        <p className={styles.examples}>
          Try{' '}
          {EXAMPLES.map((example, index) => (
            <span key={example}>
              <Link href={`/repos/${example}`}>{example}</Link>
              {index < EXAMPLES.length - 1 ? ', ' : ''}
            </span>
          ))}
          .
        </p>
      </Panel>
    </>
  );
}
