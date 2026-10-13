import type { Metadata } from 'next';
import { Suspense } from 'react';
import TrackerClient from './TrackerClient';

export const metadata: Metadata = {
  title: 'Tracker',
  description: 'Track the open source issues you are working on, from saved to merged.',
  robots: { index: false },
};

export default function TrackerPage() {
  return (
    <Suspense fallback={null}>
      <TrackerClient />
    </Suspense>
  );
}
