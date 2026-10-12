import type { ForumState } from '@/lib/community.server';
import { EmptyState } from '@/components/ui/primitives';
import { IconMessageSquare } from '@/components/icons';

/** Shown until migration 07 runs, or when the database doesn't answer. */
export default function ForumUnavailable({ state }: { state: Exclude<ForumState, 'ready'> }) {
  return (
    <EmptyState icon={<IconMessageSquare size={16} />} title={state === 'unavailable' ? 'Discussions are unavailable right now' : 'Discussions are being set up'}>
      {state === 'unavailable'
        ? 'The database did not answer. Try again in a moment.'
        : 'This is where contributors will ask questions and share their work. It opens as soon as the database is ready.'}
    </EmptyState>
  );
}
