// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrackedIssue } from '@/types/database';

/* ---------------- Fakes ---------------- */

type Op = 'select' | 'insert' | 'upsert' | 'update' | 'delete';
interface Call {
  table: string;
  op: Op;
  payload?: unknown;
}
type Result = { data: unknown; error: { message: string; code?: string } | null };

const calls: Call[] = [];
let respond: (call: Call) => Result = () => ({ data: [], error: null });

function builder(table: string) {
  const call: Call = { table, op: 'select' };
  const run = () => {
    calls.push({ ...call });
    return Promise.resolve(respond(call));
  };
  const api = {
    select: () => api,
    eq: () => api,
    order: () => api,
    insert: (payload: unknown) => ((call.op = 'insert'), (call.payload = payload), api),
    upsert: (payload: unknown) => ((call.op = 'upsert'), (call.payload = payload), api),
    update: (payload: unknown) => ((call.op = 'update'), (call.payload = payload), api),
    delete: () => ((call.op = 'delete'), api),
    single: run,
    maybeSingle: run,
    then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) => run().then(resolve, reject),
  };
  return api;
}

const toast = vi.fn();

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ from: (table: string) => builder(table) }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));

const { WorkspaceProvider, useWorkspace } = await import('./WorkspaceContext');

function row(over: Partial<TrackedIssue> = {}): TrackedIssue {
  return {
    id: 'row-1',
    user_id: 'user-1',
    issue_url: 'https://github.com/a/b/issues/1',
    issue_number: 1,
    repo_full_name: 'a/b',
    title: 'Fix the thing',
    description: null,
    labels: [],
    status: 'saved',
    has_bounty: false,
    bounty_amount: null,
    bounty_source: null,
    notes: null,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    ...over,
  };
}

const wrapper = ({ children }: { children: ReactNode }) => <WorkspaceProvider>{children}</WorkspaceProvider>;

async function mount(initial: TrackedIssue[]) {
  respond = call => (call.op === 'select' && call.table === 'tracked_issues' ? { data: initial, error: null } : { data: [], error: null });
  const hook = renderHook(() => useWorkspace(), { wrapper });
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

beforeEach(() => {
  calls.length = 0;
  toast.mockClear();
});

/* ---------------- Tests ---------------- */

describe('WorkspaceProvider', () => {
  it('loads the signed-in user’s tracked issues', async () => {
    const { result } = await mount([row()]);
    expect(result.current.issues).toHaveLength(1);
    expect(result.current.getTracked('https://github.com/a/b/issues/1')?.id).toBe('row-1');
  });

  it('adds a new issue optimistically and swaps in the server row', async () => {
    const { result } = await mount([]);
    respond = call => (call.op === 'upsert' ? { data: row({ id: 'server-1' }), error: null } : { data: null, error: null });

    let ok = false;
    await act(async () => {
      ok = await result.current.track({ url: 'https://github.com/a/b/issues/1', number: 1, repo: 'a/b', title: 'Fix the thing' });
    });

    expect(ok).toBe(true);
    expect(result.current.issues.map(i => i.id)).toEqual(['server-1']);
    expect(calls.some(c => c.table === 'tracked_issues' && c.op === 'upsert')).toBe(true);
  });

  it('moves an already-tracked issue instead of resetting it to saved', async () => {
    const { result } = await mount([row({ status: 'ongoing', notes: 'keep me' })]);
    respond = () => ({ data: null, error: null });

    await act(async () => {
      await result.current.track({ url: 'https://github.com/a/b/issues/1', number: 1, repo: 'a/b', title: 'Fix the thing' }, 'pr_submitted');
    });

    expect(calls.some(c => c.op === 'upsert')).toBe(false);
    expect(calls.find(c => c.op === 'update')?.payload).toEqual({ status: 'pr_submitted' });
    expect(result.current.issues[0].status).toBe('pr_submitted');
    expect(result.current.issues[0].notes).toBe('keep me');
  });

  it('rolls back a failed status change and reports it', async () => {
    const { result } = await mount([row({ status: 'saved' })]);
    respond = call => (call.op === 'update' ? { data: null, error: { message: 'permission denied' } } : { data: null, error: null });

    let ok = true;
    await act(async () => {
      ok = await result.current.setStatus('row-1', 'completed');
    });

    expect(ok).toBe(false);
    expect(result.current.issues[0].status).toBe('saved');
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('permission denied'), expect.objectContaining({ tone: 'error' }));
  });

  it('removes an issue and offers undo', async () => {
    const { result } = await mount([row()]);
    respond = () => ({ data: null, error: null });

    await act(async () => {
      await result.current.untrack('row-1');
    });

    expect(result.current.issues).toHaveLength(0);
    expect(toast).toHaveBeenCalledWith('Removed from tracker', expect.objectContaining({ action: expect.objectContaining({ label: 'Undo' }) }));
  });

  it('treats a duplicate saved repo as success', async () => {
    const { result } = await mount([]);
    const saved = { id: 'repo-row', user_id: 'user-1', repo_full_name: 'a/b', repo_data: {}, notes: null, created_at: '2026-10-01T00:00:00Z' };
    respond = call => {
      if (call.op === 'insert') return { data: null, error: { message: 'duplicate', code: '23505' } };
      if (call.op === 'select' && call.table === 'saved_repos') return { data: saved, error: null };
      return { data: null, error: null };
    };

    let ok = false;
    await act(async () => {
      ok = await result.current.saveRepo({
        id: 1,
        name: 'b',
        full_name: 'a/b',
        description: null,
        html_url: 'https://github.com/a/b',
        homepage: null,
        language: 'Go',
        stargazers_count: 1,
        forks_count: 0,
        open_issues_count: 0,
        watchers_count: 0,
        topics: [],
        created_at: '',
        updated_at: '',
        pushed_at: '',
        owner: { login: 'a', avatar_url: '', html_url: '' },
        license: null,
      });
    });

    expect(ok).toBe(true);
    expect(result.current.repos.map(r => r.id)).toEqual(['repo-row']);
    expect(toast).not.toHaveBeenCalled();
  });
});
