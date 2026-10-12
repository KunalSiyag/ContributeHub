import type { BountyIssue } from '@/lib/bounties';

/** Matches the server's initial fetch and the API's maximum `limit`. */
export const BOUNTY_LIMIT = 80;

export interface BountySet {
  bounties: BountyIssue[];
  /** Some GitHub searches failed, so the set may be incomplete. */
  partial: boolean;
}

export interface BountyLoadError {
  /** Safe to show users (comes from the API's `message` field). */
  message: string;
  /** Epoch ms when GitHub's rate limit lifts, when the error was a rate limit. */
  resetAt?: number;
}
