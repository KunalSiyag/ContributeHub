import type { Metadata } from 'next';
import { getOfficialSchedules } from '@/lib/programs.server';
import OverviewClient from './OverviewClient';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Your tracked issues, pull requests, contribution calendar and upcoming program deadlines.',
  robots: { index: false },
};

export default async function OverviewPage() {
  // Published program dates (GSoC) replace calendar rules in the deadlines panel.
  return <OverviewClient official={await getOfficialSchedules()} />;
}
