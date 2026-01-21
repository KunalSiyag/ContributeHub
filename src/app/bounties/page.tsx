import { fetchAllBounties, BountySource } from '@/lib/bounties';
import BountiesClient from './BountiesClient';

export const metadata = {
  title: 'Bounties | ContributeHub',
  description: 'Find open source bounty issues and get paid for your contributions.',
};

export default async function BountiesPage() {
  // Fetch initial bounties server-side
  const bounties = await fetchAllBounties('all', 30);

  return <BountiesClient initialBounties={bounties} />;
}
