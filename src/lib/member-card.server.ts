import 'server-only';
import type { ProfileBanner } from '@/types/database';
import { createAnonClient, isSupabaseConfigured } from './supabase/server';

export interface MemberCard {
  name: string;
  banner: ProfileBanner | null;
  /** Their GitHub username comes from signing in with that GitHub account. */
  verified: boolean;
}

/** An opted-in member's public card (migration 10); null for everyone else or before the migration. */
export async function getMemberCard(login: string): Promise<MemberCard | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await createAnonClient().rpc('member_card', { login });
  const card = !error && Array.isArray(data) ? data[0] : undefined;
  return card ? { name: card.display_name, banner: card.profile_banner, verified: Boolean(card.verified) } : null;
}
