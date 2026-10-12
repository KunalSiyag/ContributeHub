'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';
import { useToast } from '@/components/ui/Toast';
import type { IssueStatus, Json, SavedRepo, TrackedIssue } from '@/types/database';
import type { Repository } from '@/types';

export type { IssueStatus, SavedRepo, TrackedIssue };

export const ISSUE_STATUSES: Array<{ value: IssueStatus; label: string; short: string }> = [
  { value: 'saved', label: 'Saved', short: 'Saved' },
  { value: 'ongoing', label: 'Working on it', short: 'Working' },
  { value: 'pr_submitted', label: 'PR open', short: 'PR open' },
  { value: 'completed', label: 'Merged', short: 'Merged' },
];

export function statusLabel(status: IssueStatus) {
  return ISSUE_STATUSES.find(s => s.value === status)?.label ?? status;
}

export interface TrackInput {
  url: string;
  number: number;
  repo: string;
  title: string;
  description?: string | null;
  labels?: string[];
  hasBounty?: boolean;
  bountyAmount?: string | null;
  bountySource?: string | null;
}

interface WorkspaceValue {
  /** True once the current user's rows have loaded (or there is no user). */
  ready: boolean;
  issues: TrackedIssue[];
  repos: SavedRepo[];
  getTracked: (issueUrl: string) => TrackedIssue | undefined;
  getSavedRepo: (fullName: string) => SavedRepo | undefined;
  track: (input: TrackInput, status?: IssueStatus) => Promise<boolean>;
  setStatus: (id: string, status: IssueStatus) => Promise<boolean>;
  setNotes: (id: string, notes: string) => Promise<boolean>;
  untrack: (id: string) => Promise<boolean>;
  saveRepo: (repo: Repository) => Promise<boolean>;
  unsaveRepo: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

function sortIssues(list: TrackedIssue[]) {
  return [...list].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

/** Best-effort activity log used for aggregate stats; failures are ignored. */
function logActivity(userId: string, action: 'issue_save' | 'pr_submit' | 'repo_save', metadata: Json) {
  createClient()
    .from('user_activity')
    .insert({ user_id: userId, action_type: action, metadata })
    .then(
      () => undefined,
      () => undefined
    );
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<{ userId: string; issues: TrackedIssue[]; repos: SavedRepo[] } | null>(null);

  const userId = user?.id ?? null;
  const current = state && state.userId === userId ? state : null;
  const issues = useMemo(() => current?.issues ?? [], [current]);
  const repos = useMemo(() => current?.repos ?? [], [current]);

  const load = useCallback(async (id: string) => {
    const supabase = createClient();
    const [issuesResult, reposResult] = await Promise.all([
      supabase.from('tracked_issues').select('*').eq('user_id', id).order('updated_at', { ascending: false }),
      supabase.from('saved_repos').select('*').eq('user_id', id).order('created_at', { ascending: false }),
    ]);
    setState({
      userId: id,
      issues: issuesResult.data ?? [],
      repos: reposResult.data ?? [],
    });
    if (issuesResult.error || reposResult.error) {
      toast('Some of your workspace could not be loaded. Refresh to try again.', { tone: 'error' });
    }
  }, [toast]);

  useEffect(() => {
    if (!userId) return;
    load(userId).catch(() => setState({ userId, issues: [], repos: [] }));
  }, [userId, load]);

  const patchIssues = useCallback(
    (fn: (list: TrackedIssue[]) => TrackedIssue[]) =>
      setState(prev => (prev && prev.userId === userId ? { ...prev, issues: sortIssues(fn(prev.issues)) } : prev)),
    [userId]
  );

  const patchRepos = useCallback(
    (fn: (list: SavedRepo[]) => SavedRepo[]) =>
      setState(prev => (prev && prev.userId === userId ? { ...prev, repos: fn(prev.repos) } : prev)),
    [userId]
  );

  const setStatus = useCallback(
    async (id: string, status: IssueStatus) => {
      if (!userId) return false;
      const previous = issues.find(item => item.id === id);
      if (!previous || previous.status === status) return true;
      const now = new Date().toISOString();
      patchIssues(list => list.map(item => (item.id === id ? { ...item, status, updated_at: now } : item)));

      const { error } = await createClient()
        .from('tracked_issues')
        .update({ status })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        patchIssues(list => list.map(item => (item.id === id ? previous : item)));
        toast(`Couldn't update status: ${error.message}`, { tone: 'error' });
        return false;
      }
      if (status === 'pr_submitted') logActivity(userId, 'pr_submit', { issue_id: id });
      return true;
    },
    [userId, issues, patchIssues, toast]
  );

  const track = useCallback(
    async (input: TrackInput, status: IssueStatus = 'saved') => {
      if (!userId) return false;
      // Already tracked: only move it, never reset its status or notes.
      const existing = issues.find(item => item.issue_url === input.url);
      if (existing) return setStatus(existing.id, status);
      const now = new Date().toISOString();
      const tempId = `temp-${now}-${input.url}`;
      const optimistic: TrackedIssue = {
        id: tempId,
        user_id: userId,
        issue_url: input.url,
        issue_number: input.number,
        repo_full_name: input.repo,
        title: input.title,
        description: input.description ?? null,
        labels: input.labels ?? [],
        status,
        has_bounty: input.hasBounty ?? false,
        bounty_amount: input.bountyAmount ?? null,
        bounty_source: input.bountySource ?? null,
        notes: null,
        created_at: now,
        updated_at: now,
      };
      patchIssues(list => [optimistic, ...list.filter(item => item.issue_url !== input.url)]);

      const { data, error } = await createClient()
        .from('tracked_issues')
        .upsert(
          {
            user_id: userId,
            issue_url: input.url,
            issue_number: input.number,
            repo_full_name: input.repo,
            title: input.title,
            description: input.description ? input.description.slice(0, 2000) : null,
            labels: input.labels ?? [],
            status,
            has_bounty: input.hasBounty ?? false,
            bounty_amount: input.bountyAmount ?? null,
            bounty_source: input.bountySource ?? null,
          },
          { onConflict: 'user_id,issue_url' }
        )
        .select('*')
        .single();

      if (error || !data) {
        patchIssues(list => list.filter(item => item.id !== tempId));
        toast(`Couldn't track this issue${error ? `: ${error.message}` : '.'}`, { tone: 'error' });
        return false;
      }

      patchIssues(list => list.map(item => (item.id === tempId ? data : item)));
      logActivity(userId, 'issue_save', { issue_url: input.url });
      return true;
    },
    [userId, issues, patchIssues, setStatus, toast]
  );

  const setNotes = useCallback(
    async (id: string, notes: string) => {
      if (!userId) return false;
      const previous = issues.find(item => item.id === id);
      if (!previous) return false;
      const value = notes.trim() ? notes.slice(0, 4000) : null;
      patchIssues(list => list.map(item => (item.id === id ? { ...item, notes: value } : item)));

      const { error } = await createClient()
        .from('tracked_issues')
        .update({ notes: value })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        patchIssues(list => list.map(item => (item.id === id ? previous : item)));
        toast(`Couldn't save notes: ${error.message}`, { tone: 'error' });
        return false;
      }
      return true;
    },
    [userId, issues, patchIssues, toast]
  );

  const untrack = useCallback(
    async (id: string) => {
      if (!userId) return false;
      const previous = issues.find(item => item.id === id);
      if (!previous) return false;
      patchIssues(list => list.filter(item => item.id !== id));

      const { error } = await createClient().from('tracked_issues').delete().eq('id', id).eq('user_id', userId);
      if (error) {
        patchIssues(list => [previous, ...list]);
        toast(`Couldn't remove issue: ${error.message}`, { tone: 'error' });
        return false;
      }

      toast('Removed from tracker', {
        action: {
          label: 'Undo',
          onClick: () => {
            const { id: _drop, created_at: _c, updated_at: _u, ...rest } = previous;
            void _drop;
            void _c;
            void _u;
            createClient()
              .from('tracked_issues')
              .insert(rest)
              .select('*')
              .single()
              .then(({ data }) => {
                if (data) patchIssues(list => [data, ...list.filter(item => item.issue_url !== data.issue_url)]);
              });
          },
        },
      });
      return true;
    },
    [userId, issues, patchIssues, toast]
  );

  const saveRepo = useCallback(
    async (repo: Repository) => {
      if (!userId) return false;
      const now = new Date().toISOString();
      const tempId = `temp-${now}-${repo.full_name}`;
      const repoData: Json = {
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        open_issues_count: repo.open_issues_count,
        topics: (repo.topics ?? []).slice(0, 12),
        owner: { login: repo.owner.login, avatar_url: repo.owner.avatar_url, html_url: repo.owner.html_url },
        pushed_at: repo.pushed_at,
      };
      patchRepos(list => [
        { id: tempId, user_id: userId, repo_full_name: repo.full_name, repo_data: repoData, notes: null, created_at: now },
        ...list.filter(item => item.repo_full_name !== repo.full_name),
      ]);

      const supabase = createClient();
      let { data, error } = await supabase
        .from('saved_repos')
        .insert({ user_id: userId, repo_full_name: repo.full_name, repo_data: repoData })
        .select('*')
        .single();

      // Already saved (unique violation): load the existing row instead.
      if (error?.code === '23505') {
        ({ data, error } = await supabase
          .from('saved_repos')
          .select('*')
          .eq('user_id', userId)
          .eq('repo_full_name', repo.full_name)
          .single());
      }

      if (error || !data) {
        patchRepos(list => list.filter(item => item.id !== tempId));
        toast(`Couldn't save repository${error ? `: ${error.message}` : '.'}`, { tone: 'error' });
        return false;
      }
      patchRepos(list => list.map(item => (item.id === tempId ? data : item)));
      logActivity(userId, 'repo_save', { repo: repo.full_name });
      return true;
    },
    [userId, patchRepos, toast]
  );

  const unsaveRepo = useCallback(
    async (id: string) => {
      if (!userId) return false;
      const previous = repos.find(item => item.id === id);
      if (!previous) return false;
      patchRepos(list => list.filter(item => item.id !== id));
      const { error } = await createClient().from('saved_repos').delete().eq('id', id).eq('user_id', userId);
      if (error) {
        patchRepos(list => [previous, ...list]);
        toast(`Couldn't remove repository: ${error.message}`, { tone: 'error' });
        return false;
      }
      return true;
    },
    [userId, repos, patchRepos, toast]
  );

  const refresh = useCallback(async () => {
    if (userId) await load(userId);
  }, [userId, load]);

  const value = useMemo<WorkspaceValue>(() => {
    const byUrl = new Map(issues.map(item => [item.issue_url, item]));
    const byRepo = new Map(repos.map(item => [item.repo_full_name, item]));
    return {
      ready: !userId || Boolean(current),
      issues,
      repos,
      getTracked: url => byUrl.get(url),
      getSavedRepo: name => byRepo.get(name),
      track,
      setStatus,
      setNotes,
      untrack,
      saveRepo,
      unsaveRepo,
      refresh,
    };
  }, [userId, current, issues, repos, track, setStatus, setNotes, untrack, saveRepo, unsaveRepo, refresh]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return value;
}
