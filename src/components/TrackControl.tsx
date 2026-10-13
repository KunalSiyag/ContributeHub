'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useSignIn } from './auth/SignIn';
import { ISSUE_STATUSES, statusLabel, useWorkspace, type IssueStatus, type TrackInput } from '@/contexts/WorkspaceContext';
import { useToast } from './ui/Toast';
import { Button } from './ui/Button';
import { Menu } from './ui/Menu';
import { StatusDot, type StatusTone } from './ui/primitives';
import { IconBookmark, IconChevronDown, IconExternalLink, IconTrash } from './icons';

export const STATUS_TONE: Record<IssueStatus, StatusTone> = {
  saved: 'neutral',
  ongoing: 'working',
  pr_submitted: 'review',
  completed: 'done',
};

interface TrackControlProps {
  issue: TrackInput;
  size?: 'sm' | 'md';
  /** Show "Track" text next to the icon when untracked. */
  label?: boolean;
}

/**
 * Track an issue, or move a tracked issue through the pipeline.
 * Signed-out visitors are offered sign-in and come back here.
 */
export default function TrackControl({ issue, size = 'sm', label = true }: TrackControlProps) {
  const { user } = useAuth();
  const { openSignIn } = useSignIn();
  const { getTracked, track, setStatus, untrack } = useWorkspace();
  const { toast } = useToast();
  const tracked = user ? getTracked(issue.url) : undefined;

  if (!tracked) {
    const onTrack = async () => {
      if (!user) {
        toast('Sign in to track issues.', {
          action: { label: 'Sign in', onClick: () => openSignIn() },
        });
        return;
      }
      const ok = await track(issue);
      if (ok) toast('Added to your tracker', { tone: 'success' });
    };

    return (
      <Button
        variant="secondary"
        size={size}
        iconOnly={!label}
        onClick={onTrack}
        aria-label={label ? undefined : `Track ${issue.title}`}
        title="Add to your tracker"
      >
        <IconBookmark size={14} />
        {label && 'Track'}
      </Button>
    );
  }

  const busy = tracked.id.startsWith('temp-');

  return (
    <Menu
      align="end"
      label="Issue status"
      items={[
        { type: 'label', label: 'Move to' },
        ...ISSUE_STATUSES.map(status => ({
          label: status.label,
          icon: <StatusDot tone={STATUS_TONE[status.value]} />,
          checked: tracked.status === status.value,
          onSelect: () => {
            setStatus(tracked.id, status.value);
          },
        })),
        { type: 'separator' as const },
        { label: 'Open on GitHub', icon: <IconExternalLink size={14} />, href: issue.url, external: true },
        { label: 'Remove from tracker', icon: <IconTrash size={14} />, danger: true, onSelect: () => untrack(tracked.id) },
      ]}
      trigger={props => (
        <Button variant="secondary" size={size} disabled={busy} {...props} aria-label={`Status: ${statusLabel(tracked.status)}`}>
          <StatusDot tone={STATUS_TONE[tracked.status]}>{statusLabel(tracked.status)}</StatusDot>
          <IconChevronDown size={12} />
        </Button>
      )}
    />
  );
}
