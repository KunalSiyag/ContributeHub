'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useRef, useState, type DragEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ISSUE_STATUSES, statusLabel, useWorkspace, type IssueStatus, type TrackedIssue } from '@/contexts/WorkspaceContext';
import type { Repository } from '@/types';
import { PageHeader, EmptyState, Skeleton, StatusDot, Tag } from '@/components/ui/primitives';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Segmented, Tabs } from '@/components/ui/Tabs';
import { Menu } from '@/components/ui/Menu';
import { Dialog } from '@/components/ui/Dialog';
import { Checkbox, Field, Input, SearchInput, Select, Textarea, Toolbar, toolbarClasses } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { ApiError, fetchJson } from '@/lib/fetch-json';
import { STATUS_TONE } from '@/components/TrackControl';
import RelativeTime from '@/components/RelativeTime';
import RepoRow from '@/components/RepoRow';
import SignInGate from '@/components/SignInGate';
import {
  IconBookmark,
  IconChevronDown,
  IconColumns,
  IconCompass,
  IconExternalLink,
  IconList,
  IconMore,
  IconPencil,
  IconPlus,
  IconTrash,
} from '@/components/icons';
import rows from '@/components/rows.module.css';
import styles from './tracker.module.css';
import { useBoardFlip } from './useBoardFlip';
import Watchlist from './Watchlist';

type View = 'board' | 'list';
type Section = 'issues' | 'repos';

function issuePath(issue: TrackedIssue) {
  return `/issues/${issue.repo_full_name}/${issue.issue_number}`;
}

/* ---------------- Status menu for a tracked row ---------------- */

function StatusMenu({
  issue,
  onNotes,
  onMove,
}: {
  issue: TrackedIssue;
  onNotes: () => void;
  onMove: (status: IssueStatus) => void;
}) {
  const { untrack } = useWorkspace();
  const busy = issue.id.startsWith('temp-');

  return (
    <Menu
      align="end"
      label={`Actions for ${issue.title}`}
      items={[
        { type: 'label', label: 'Move to' },
        ...ISSUE_STATUSES.map(status => ({
          label: status.label,
          icon: <StatusDot tone={STATUS_TONE[status.value]} />,
          checked: issue.status === status.value,
          onSelect: () => onMove(status.value),
        })),
        { type: 'separator' as const },
        { label: issue.notes ? 'Edit notes' : 'Add notes', icon: <IconPencil size={14} />, onSelect: onNotes },
        { label: 'Open on GitHub', icon: <IconExternalLink size={14} />, href: issue.issue_url, external: true },
        { label: 'Remove', icon: <IconTrash size={14} />, danger: true, onSelect: () => untrack(issue.id) },
      ]}
      trigger={props => (
        <Button variant="ghost" size="sm" iconOnly disabled={busy} aria-label="Issue actions" {...props}>
          <IconMore size={15} />
        </Button>
      )}
    />
  );
}

/* ---------------- Board card ---------------- */

function BoardCard({
  issue,
  onNotes,
  onMove,
  onDragStart,
  onDragEnd,
  dragging,
}: {
  issue: TrackedIssue;
  onNotes: () => void;
  onMove: (status: IssueStatus) => void;
  onDragStart: (event: DragEvent<HTMLLIElement>) => void;
  onDragEnd: () => void;
  dragging: boolean;
}) {
  return (
    <li
      className={[styles.card, dragging && styles.cardDragging].filter(Boolean).join(' ')}
      data-spotlight
      data-flip-id={issue.id}
      draggable={!issue.id.startsWith('temp-')}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className={styles.cardTop}>
        <span className={styles.cardRepo}>
          {issue.repo_full_name}
          <span className={styles.cardNumber}>#{issue.issue_number}</span>
        </span>
        {issue.has_bounty && <span className={styles.cardAmount}>{issue.bounty_amount || 'Bounty'}</span>}
      </div>
      <Link href={issuePath(issue)} className={styles.cardTitle}>
        {issue.title}
      </Link>
      {issue.labels.length > 0 && (
        <div className={styles.cardTags}>
          {issue.labels.slice(0, 3).map(label => (
            <Tag key={label} tone="muted">
              {label}
            </Tag>
          ))}
        </div>
      )}
      {issue.notes && (
        <button type="button" className={styles.cardNote} onClick={onNotes} title="Edit notes">
          <span className={styles.cardNoteText}>{issue.notes}</span>
        </button>
      )}
      <div className={styles.cardFoot}>
        <RelativeTime date={issue.updated_at} prefix="Updated" className={styles.cardTime} />
        <StatusMenu issue={issue} onNotes={onNotes} onMove={onMove} />
      </div>
    </li>
  );
}

/* ---------------- Page ---------------- */

export default function TrackerClient() {
  const { user, loading } = useAuth();
  const { ready, issues, repos, setStatus, setNotes, track, getTracked } = useWorkspace();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [addUrl, setAddUrl] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const view: View = params.get('view') === 'list' ? 'list' : 'board';
  const section: Section = params.get('tab') === 'repos' ? 'repos' : 'issues';
  const [query, setQuery] = useState('');
  const [repoFilter, setRepoFilter] = useState('all');
  const [bountyOnly, setBountyOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<IssueStatus | null>(null);
  const [noteIssue, setNoteIssue] = useState<TrackedIssue | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const repoOptions = useMemo(() => {
    const names = Array.from(new Set(issues.map(issue => issue.repo_full_name))).sort((a, b) => a.localeCompare(b));
    return [{ value: 'all', label: 'All repositories' }, ...names.map(name => ({ value: name, label: name }))];
  }, [issues]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return issues.filter(issue => {
      if (repoFilter !== 'all' && issue.repo_full_name !== repoFilter) return false;
      if (bountyOnly && !issue.has_bounty) return false;
      if (view === 'list' && statusFilter !== 'all' && issue.status !== statusFilter) return false;
      if (!q) return true;
      return (
        issue.title.toLowerCase().includes(q) ||
        issue.repo_full_name.toLowerCase().includes(q) ||
        (issue.notes ?? '').toLowerCase().includes(q) ||
        issue.labels.some(label => label.toLowerCase().includes(q))
      );
    });
  }, [issues, query, repoFilter, bountyOnly, statusFilter, view]);

  const byStatus = useMemo(() => {
    const groups: Record<IssueStatus, TrackedIssue[]> = { saved: [], ongoing: [], pr_submitted: [], completed: [] };
    for (const issue of filtered) groups[issue.status].push(issue);
    return groups;
  }, [filtered]);

  // Cards glide to their new column when a status changes (GSAP Flip).
  const boardRef = useRef<HTMLDivElement>(null);
  const boardLayout = ISSUE_STATUSES.map(status => byStatus[status.value].map(issue => issue.id).join(',')).join('|');
  const captureBoard = useBoardFlip(boardRef, boardLayout);
  const moveIssue = (id: string, status: IssueStatus) => {
    captureBoard();
    setStatus(id, status);
  };

  const openNotes = (issue: TrackedIssue) => {
    setNoteIssue(issue);
    setNoteDraft(issue.notes ?? '');
  };

  const saveNotes = async () => {
    if (!noteIssue) return;
    setSavingNote(true);
    const ok = await setNotes(noteIssue.id, noteDraft);
    setSavingNote(false);
    if (ok) setNoteIssue(null);
  };

  const closeAdd = () => {
    setAddOpen(false);
    setAddUrl('');
    setAddError(null);
  };

  const addByUrl = async () => {
    setAdding(true);
    setAddError(null);
    try {
      const issue = await fetchJson<{
        url: string;
        number: number;
        repo: string;
        title: string;
        state: 'open' | 'closed';
        labels: string[];
        description: string;
      }>(`/api/github/issue?url=${encodeURIComponent(addUrl.trim())}`);
      if (getTracked(issue.url)) {
        setAddError('That issue is already on your tracker.');
        return;
      }
      const ok = await track({ ...issue });
      if (ok) {
        closeAdd();
        toast(issue.state === 'closed' ? 'Added. Note: this issue is already closed.' : 'Added to Saved', {
          tone: issue.state === 'closed' ? 'default' : 'success',
        });
      }
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : 'Could not load that issue.');
    } finally {
      setAdding(false);
    }
  };

  const onDrop = (status: IssueStatus) => (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain') || dragId;
    setDropTarget(null);
    setDragId(null);
    if (id) moveIssue(id, status);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <PageHeader eyebrow="Workspace" title="Tracker" />
        <div className={styles.boardSkeleton} aria-busy="true">
          {ISSUE_STATUSES.map(status => (
            <div key={status.value} className={styles.columnSkeleton}>
              <Skeleton width={90} height={12} />
              <Skeleton height={96} radius={6} />
              <Skeleton height={96} radius={6} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.page}>
        <PageHeader eyebrow="Workspace" title="Tracker" description="Every issue you save, from first look to merged pull request." />
        <SignInGate
          title="Sign in to start your tracker"
          description="Your tracker is tied to your account, so it follows you across devices."
          points={[
            'Save issues from Discover, Bounties and resume matches',
            'Move each one from saved to merged on a board',
            'Keep notes per issue and see it all on your overview',
          ]}
          next="/issues"
        />
      </div>
    );
  }

  const activeCount = issues.filter(issue => issue.status !== 'completed').length;
  const inProgress = issues.filter(issue => issue.status === 'ongoing' || issue.status === 'pr_submitted').length;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Workspace"
        title="Tracker"
        description={
          ready && issues.length > 0
            ? `${issues.length} tracked · ${inProgress} in progress · ${issues.length - activeCount} merged`
            : 'Every issue you save, from first look to merged pull request.'
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(true)}>
              <IconPlus size={14} />
              Add by URL
            </Button>
            <ButtonLink href="/discover" variant="primary">
              <IconCompass size={14} />
              Find issues
            </ButtonLink>
          </>
        }
      />

      <Tabs<Section>
        label="Tracker sections"
        value={section}
        items={[
          { value: 'issues', label: 'Issues', count: ready ? issues.length : undefined, href: `${pathname}${view === 'list' ? '?view=list' : ''}` },
          { value: 'repos', label: 'Saved repositories', count: ready ? repos.length : undefined, href: `${pathname}?tab=repos` },
        ]}
      />

      {section === 'repos' ? (
        <div className={styles.section}>
          {!ready ? (
            <Skeleton height={180} radius={6} />
          ) : repos.length === 0 ? (
            <EmptyState
              icon={<IconBookmark size={16} />}
              title="No saved repositories yet"
              action={
                <ButtonLink href="/discover?tab=projects" variant="secondary">
                  Explore projects
                </ButtonLink>
              }
            >
              Save projects you want to contribute to and they will be listed here.
            </EmptyState>
          ) : (
            <>
              <Watchlist repos={repos.map(saved => saved.repo_full_name)} />
              <ul className={rows.list} aria-label="Saved repositories">
                {repos.map(saved => (
                  <RepoRow key={saved.id} repo={saved.repo_data as unknown as Repository} />
                ))}
              </ul>
            </>
          )}
          {ready && repos.length > 0 && (
            <p className={styles.footnote}>Use the bookmark button on a row to remove it from this list.</p>
          )}
        </div>
      ) : (
        <div className={styles.section}>
          <Toolbar className={styles.toolbar}>
            <SearchInput
              value={query}
              onValueChange={setQuery}
              placeholder="Filter by title, repository, label or note…"
              wrapperClassName={toolbarClasses.grow}
              aria-label="Filter tracked issues"
            />
            <Select
              aria-label="Repository"
              value={repoFilter}
              onChange={event => setRepoFilter(event.target.value)}
              options={repoOptions}
              wrapperClassName={styles.repoSelect}
            />
            {view === 'list' && (
              <Select
                aria-label="Status"
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value as IssueStatus | 'all')}
                options={[{ value: 'all', label: 'All statuses' }, ...ISSUE_STATUSES.map(s => ({ value: s.value, label: s.label }))]}
              />
            )}
            <Checkbox label="Bounties only" checked={bountyOnly} onChange={event => setBountyOnly(event.target.checked)} />
            <span className={toolbarClasses.spacer} />
            <Segmented<View>
              label="Layout"
              iconOnly
              value={view}
              onChange={next => setParam('view', next === 'list' ? 'list' : null)}
              options={[
                { value: 'board', label: 'Board', title: 'Board view', icon: <IconColumns size={14} /> },
                { value: 'list', label: 'List', title: 'List view', icon: <IconList size={14} /> },
              ]}
            />
          </Toolbar>

          <p className="visually-hidden" aria-live="polite">
            {ready ? `${filtered.length} issues shown` : ''}
          </p>

          {!ready ? (
            <div className={styles.boardSkeleton} aria-busy="true">
              {ISSUE_STATUSES.map(status => (
                <div key={status.value} className={styles.columnSkeleton}>
                  <Skeleton width={90} height={12} />
                  <Skeleton height={96} radius={6} />
                </div>
              ))}
            </div>
          ) : issues.length === 0 ? (
            <EmptyState
              icon={<IconBookmark size={16} />}
              title="Nothing tracked yet"
              action={
                <>
                  <ButtonLink href="/discover" variant="primary">
                    Find a good first issue
                  </ButtonLink>
                  <ButtonLink href="/resume" variant="secondary">
                    Match from your resume
                  </ButtonLink>
                </>
              }
            >
              Press Track on any issue in Orion. It lands in Saved, and you move it along as you work.
            </EmptyState>
          ) : view === 'board' ? (
            <div className={styles.board} ref={boardRef}>
              {ISSUE_STATUSES.map(status => {
                const items = byStatus[status.value];
                const isTarget = dropTarget === status.value;
                return (
                  <section
                    key={status.value}
                    className={[styles.column, isTarget && styles.columnTarget].filter(Boolean).join(' ')}
                    aria-label={`${status.label}, ${items.length} issues`}
                    onDragOver={event => {
                      if (!dragId) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      if (dropTarget !== status.value) setDropTarget(status.value);
                    }}
                    onDragLeave={event => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(null);
                    }}
                    onDrop={onDrop(status.value)}
                  >
                    <header className={styles.columnHead}>
                      <StatusDot tone={STATUS_TONE[status.value]}>
                        <span className={styles.columnTitle}>{status.label}</span>
                      </StatusDot>
                      <span className={styles.columnCount}>{items.length}</span>
                    </header>
                    {items.length > 0 ? (
                      <ul className={styles.cards}>
                        {items.map(issue => (
                          <BoardCard
                            key={issue.id}
                            issue={issue}
                            dragging={dragId === issue.id}
                            onNotes={() => openNotes(issue)}
                            onMove={next => moveIssue(issue.id, next)}
                            onDragStart={event => {
                              event.dataTransfer.setData('text/plain', issue.id);
                              event.dataTransfer.effectAllowed = 'move';
                              setDragId(issue.id);
                            }}
                            onDragEnd={() => {
                              setDragId(null);
                              setDropTarget(null);
                            }}
                          />
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.columnEmpty}>{dragId ? 'Drop here' : 'Nothing here'}</p>
                    )}
                  </section>
                );
              })}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No issues match these filters">
              Clear the search or pick another repository.
            </EmptyState>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Issue</th>
                    <th scope="col">Status</th>
                    <th scope="col" className={styles.hideSm}>
                      Bounty
                    </th>
                    <th scope="col" className={styles.hideSm}>
                      Updated
                    </th>
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(issue => (
                    <tr key={issue.id}>
                      <td>
                        <span className={styles.cardRepo}>
                          {issue.repo_full_name}
                          <span className={styles.cardNumber}>#{issue.issue_number}</span>
                        </span>
                        <Link href={issuePath(issue)} className={styles.rowTitle}>
                          {issue.title}
                        </Link>
                        {issue.notes && <span className={styles.rowNote}>{issue.notes}</span>}
                      </td>
                      <td>
                        <Menu
                          label="Change status"
                          items={ISSUE_STATUSES.map(status => ({
                            label: status.label,
                            icon: <StatusDot tone={STATUS_TONE[status.value]} />,
                            checked: issue.status === status.value,
                            onSelect: () => {
                              setStatus(issue.id, status.value);
                            },
                          }))}
                          trigger={props => (
                            <button type="button" className={styles.statusButton} {...props}>
                              <StatusDot tone={STATUS_TONE[issue.status]}>{statusLabel(issue.status)}</StatusDot>
                              <IconChevronDown size={12} />
                            </button>
                          )}
                        />
                      </td>
                      <td className={`${styles.hideSm} ${styles.mono}`}>{issue.has_bounty ? issue.bounty_amount || 'Yes' : '—'}</td>
                      <td className={`${styles.hideSm} ${styles.muted}`}>
                        <RelativeTime date={issue.updated_at} />
                      </td>
                      <td className={styles.actionsCell}>
                        <StatusMenu
                          issue={issue}
                          onNotes={() => openNotes(issue)}
                          onMove={status => setStatus(issue.id, status)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {ready && issues.length > 0 && view === 'board' && (
            <p className={styles.footnote}>Drag cards between columns, or use the ··· menu on a card.</p>
          )}
        </div>
      )}

      <Dialog
        open={addOpen}
        onClose={closeAdd}
        title="Add an issue by URL"
        description="Track any GitHub issue, including ones you found outside Orion. It starts in Saved."
        footer={
          <>
            <Button variant="ghost" onClick={closeAdd}>
              Cancel
            </Button>
            <Button variant="primary" onClick={addByUrl} loading={adding} disabled={!addUrl.trim()}>
              Add to tracker
            </Button>
          </>
        }
      >
        <form
          onSubmit={event => {
            event.preventDefault();
            if (addUrl.trim()) addByUrl();
          }}
        >
          <Field label="Issue URL" error={addError}>
            {(id, describedBy) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                type="url"
                inputMode="url"
                value={addUrl}
                onChange={event => setAddUrl(event.target.value)}
                placeholder="https://github.com/owner/repo/issues/123"
                invalid={Boolean(addError)}
                spellCheck={false}
                autoComplete="off"
                autoFocus
              />
            )}
          </Field>
        </form>
      </Dialog>

      <Dialog
        open={noteIssue !== null}
        onClose={() => setNoteIssue(null)}
        title="Notes"
        description={noteIssue ? `${noteIssue.repo_full_name} #${noteIssue.issue_number} · ${noteIssue.title}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setNoteIssue(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveNotes} loading={savingNote}>
              Save notes
            </Button>
          </>
        }
      >
        <Textarea
          aria-label="Notes"
          value={noteDraft}
          onChange={event => setNoteDraft(event.target.value)}
          placeholder="Plan, blockers, links to your branch or pull request…"
          rows={6}
          maxLength={4000}
          autoFocus
        />
      </Dialog>
    </div>
  );
}
