import type { Metadata } from 'next';
import { isAIAvailable, isGoogleSearchEnabled } from '@/lib/gemini';
import { EmptyState, PageHeader } from '@/components/ui/primitives';
import { IconSparkles } from '@/components/icons';
import AssistantClient from './AssistantClient';

export const metadata: Metadata = {
  title: 'Assistant',
  description: 'Ask about any open source repository or program: what a project does, how to set it up, where to start and which programs are open.',
  alternates: { canonical: '/assistant' },
};

export const dynamic = 'force-dynamic';

export default async function AssistantPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { repo } = await searchParams;
  const initialRepo = repo && /^[\w.-]+\/[\w.-]+$/.test(repo) ? repo : null;
  const available = await isAIAvailable();

  return (
    <>
      <PageHeader
        eyebrow="Grow"
        title="Assistant"
        description="Ask about a repository, an issue or a program. Answers are grounded in the repository's own files and in Orion's live program dates."
      />
      {available ? (
        <AssistantClient initialRepo={initialRepo} googleSearch={isGoogleSearchEnabled()} />
      ) : (
        <EmptyState icon={<IconSparkles size={16} />} title="The assistant is switched off">
          It needs a Google Gemini API key on the server (GOOGLE_GEMINI_API_KEY). Everything else in Orion works without it.
        </EmptyState>
      )}
    </>
  );
}
