import type { Metadata } from 'next';
import { parseRepoInput } from '../repos/repo-input';
import { getSiteUrl } from '@/lib/site';
import { PageHeader } from '@/components/ui/primitives';
import RepoBotBuilder from './RepoBotBuilder';

const description =
  'Welcome first-time contributors, thank them when a pull request merges and answer slash commands like /guide, with a GitHub Actions workflow that runs in your own repository.';

export const metadata: Metadata = {
  title: 'Repo bot',
  description,
  alternates: { canonical: '/repo-bot' },
};

export default async function RepoBotPage({ searchParams }: { searchParams: Promise<{ repo?: string }> }) {
  const { repo } = await searchParams;
  const parsed = repo ? parseRepoInput(repo) : null;
  return (
    <>
      <PageHeader
        eyebrow="Maintain"
        title="Repo bot"
        description="Greets people on their first issue and pull request, thanks them when work merges, and answers commands such as /guide. It's a workflow file in your repository, so it keeps running without Orion and Orion never gets access to your code."
      />
      <RepoBotBuilder site={getSiteUrl()} initialRepository={parsed ? `${parsed.owner}/${parsed.repo}` : ''} />
    </>
  );
}
