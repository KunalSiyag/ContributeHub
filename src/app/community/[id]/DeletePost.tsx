'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

/** Lets the author remove their own post, with an inline confirmation instead of a browser dialog. */
export default function DeletePost({
  table,
  id,
  authorId,
  redirectTo,
}: {
  table: 'discussions' | 'discussion_replies';
  id: string;
  authorId: string;
  redirectTo?: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  if (user?.id !== authorId) return null;

  const remove = async () => {
    setBusy(true);
    const { error } = await createClient().from(table).delete().eq('id', id);
    setBusy(false);
    if (error) return;
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  };

  return confirming ? (
    <span style={{ display: 'inline-flex', gap: 6 }}>
      <Button size="sm" variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
        Keep
      </Button>
      <Button size="sm" variant="secondary" onClick={remove} loading={busy}>
        Delete for good
      </Button>
    </span>
  ) : (
    <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
      Delete
    </Button>
  );
}
