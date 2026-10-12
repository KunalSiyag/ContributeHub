import 'server-only';
import type { Database, DiscussionCategory } from '@/types/database';
import { createClient, isSupabaseConfigured } from './supabase/server';
import { isMissingTable } from './community';

export type Discussion = Database['public']['Tables']['discussions']['Row'];
export type Reply = Database['public']['Tables']['discussion_replies']['Row'];

/** 'ready', or why the forum can't be shown. */
export type ForumState = 'ready' | 'not-configured' | 'not-set-up' | 'unavailable';

export async function listDiscussions(category?: DiscussionCategory, limit = 50): Promise<{ state: ForumState; items: Discussion[] }> {
  if (!isSupabaseConfigured()) return { state: 'not-configured', items: [] };
  const supabase = await createClient();
  let query = supabase.from('discussions').select('*').order('last_activity_at', { ascending: false }).limit(limit);
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) return { state: isMissingTable(error) ? 'not-set-up' : 'unavailable', items: [] };
  return { state: 'ready', items: data ?? [] };
}

export async function getDiscussion(id: string): Promise<{ state: ForumState; thread: Discussion | null; replies: Reply[] }> {
  if (!isSupabaseConfigured()) return { state: 'not-configured', thread: null, replies: [] };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { state: 'ready', thread: null, replies: [] };
  const supabase = await createClient();
  const [thread, replies] = await Promise.all([
    supabase.from('discussions').select('*').eq('id', id).maybeSingle(),
    supabase.from('discussion_replies').select('*').eq('discussion_id', id).order('created_at', { ascending: true }).limit(500),
  ]);
  if (thread.error) return { state: isMissingTable(thread.error) ? 'not-set-up' : 'unavailable', thread: null, replies: [] };
  return { state: 'ready', thread: thread.data, replies: replies.data ?? [] };
}

/** The signed-in member's reaction to a discussion (migration 09); null when signed out or none. */
export async function getMyReaction(discussionId: string): Promise<'like' | 'dislike' | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('discussion_reactions').select('kind').eq('discussion_id', discussionId).maybeSingle();
  return data?.kind ?? null;
}
