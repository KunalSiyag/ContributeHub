import { Suspense } from 'react';
import IssuesClient from './IssuesClient';

export const metadata = {
  title: 'My Issues | ContributeHub',
  description: 'Track and manage your open source issues',
};

export default function IssuesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#b3b3b3' }}>Loading...</div>}>
      <IssuesClient />
    </Suspense>
  );
}
