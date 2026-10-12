'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { BODY_LIMIT } from '@/lib/community';
import { useSignIn } from '@/components/auth/SignIn';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { Notice } from '@/components/ui/primitives';
import styles from '../community.module.css';

export default function ReplyForm({ discussionId }: { discussionId: string }) {
  const { user, loading } = useAuth();
  const { openSignIn } = useSignIn();
  const router = useRouter();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && !user) {
    return (
      <Notice
        action={
          <Button size="sm" variant="secondary" onClick={() => openSignIn(`/community/${discussionId}`)}>
            Sign in to reply
          </Button>
        }
      >
        Join the conversation: replies need an account.
      </Notice>
    );
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    const { error: insertError } = await createClient().from('discussion_replies').insert({ discussion_id: discussionId, body: body.trim() });
    setSending(false);
    if (insertError) {
      setError(insertError.message.includes('Too many posts') ? insertError.message : 'Your reply could not be posted. Try again.');
      return;
    }
    setBody('');
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className={styles.replyForm}>
      <Textarea
        aria-label="Your reply (Markdown supported)"
        value={body}
        onChange={event => setBody(event.target.value)}
        maxLength={BODY_LIMIT}
        rows={4}
        placeholder="Share what worked for you, or ask a follow-up. Markdown works."
      />
      {error && <Notice tone="warning">{error}</Notice>}
      <div className={styles.formActions}>
        <span className={styles.counter}>Be kind and specific.</span>
        <Button type="submit" variant="primary" size="sm" loading={sending} disabled={!body.trim() || sending}>
          Reply
        </Button>
      </div>
    </form>
  );
}
