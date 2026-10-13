import type { Metadata } from 'next';
import { Suspense } from 'react';
import DiscoverClient from './DiscoverClient';
import DiscoverSkeleton from './DiscoverSkeleton';
import { isAIConfigured } from '@/lib/gemini';

export const metadata: Metadata = {
  title: 'Discover',
  description: 'Live GitHub search for open issues, projects and program organizations, ranked by your skills.',
};

export default function DiscoverPage() {
  // useSearchParams() in the client needs a Suspense boundary for static rendering.
  return (
    <Suspense fallback={<DiscoverSkeleton />}>
      <DiscoverClient aiAvailable={isAIConfigured()} />
    </Suspense>
  );
}
