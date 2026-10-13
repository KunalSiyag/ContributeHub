import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isGitHubUsername, normalizeGitHubInput } from '@/lib/identity';
import { Notice, PageHeader, Panel } from '@/components/ui/primitives';
import { buttonClass } from '@/components/ui/Button';
import { IconArrowRight, IconUser } from '@/components/icons';
import styles from '../repos/repos.module.css';

export const metadata: Metadata = {
  title: 'Contributor profile',
  description: 'An open source record for any GitHub account: merged pull requests, the projects they landed in and the languages behind them.',
  alternates: { canonical: '/u' },
};

export default async function ProfileLookup({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { user: input } = await searchParams;
  const login = input ? normalizeGitHubInput(input) : '';
  if (login && isGitHubUsername(login)) redirect(`/u/${login}`);

  return (
    <>
      <PageHeader
        eyebrow="Profiles"
        title="Contributor profile"
        description="Merged pull requests, the projects they landed in and the languages behind them: a shareable record of your open source work for GSoC, LFX or job applications. Built from public GitHub data only."
      />
      <Panel className={styles.lookup}>
        <form action="/u" method="get" className={styles.lookupForm} role="search">
          <label htmlFor="user-input" className={styles.lookupLabel}>
            GitHub username
          </label>
          <div className={styles.lookupRow}>
            <span className={styles.lookupField}>
              <IconUser size={15} aria-hidden="true" />
              <input
                id="user-input"
                name="user"
                defaultValue={input}
                placeholder="octocat or a GitHub profile link"
                autoComplete="off"
                spellCheck={false}
                required
                className={styles.lookupInput}
              />
            </span>
            <button type="submit" className={buttonClass({ variant: 'primary' })}>
              View profile
              <IconArrowRight size={14} />
            </button>
          </div>
        </form>
        {input && !isGitHubUsername(login) && <Notice tone="warning">That isn&rsquo;t a valid GitHub username.</Notice>}
      </Panel>
    </>
  );
}
