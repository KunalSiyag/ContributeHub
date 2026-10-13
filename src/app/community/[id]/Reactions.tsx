'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useSignIn } from '@/components/auth/SignIn';
import { useToast } from '@/components/ui/Toast';
import { IconShare, IconThumbsDown, IconThumbsUp } from '@/components/icons';
import styles from '../community.module.css';

type Kind = 'like' | 'dislike';

interface Props {
  discussionId: string;
  title: string;
  likes: number;
  dislikes: number;
  /** The signed-in member's own reaction. */
  mine: Kind | null;
}

/** Like or dislike a discussion (one reaction per member, which can change), and share it. */
export default function Reactions({ discussionId, title, likes, dislikes, mine }: Props) {
  const { user } = useAuth();
  const { openSignIn } = useSignIn();
  const { toast } = useToast();
  const [state, setState] = useState({ likes, dislikes, mine });
  const [busy, setBusy] = useState(false);

  async function react(kind: Kind) {
    if (!user) {
      openSignIn(`/community/${discussionId}`);
      return;
    }
    if (busy) return;
    const before = state;
    const count = (k: Kind) => (k === 'like' ? 'likes' : 'dislikes');
    const next = { ...state };
    if (state.mine === kind) {
      next[count(kind)] -= 1;
      next.mine = null;
    } else {
      if (state.mine) next[count(state.mine)] -= 1;
      next[count(kind)] += 1;
      next.mine = kind;
    }
    setState(next);
    setBusy(true);
    const reactions = createClient().from('discussion_reactions');
    const { error } =
      state.mine === kind
        ? await reactions.delete().eq('discussion_id', discussionId).eq('user_id', user.id)
        : state.mine
          ? await reactions.update({ kind }).eq('discussion_id', discussionId).eq('user_id', user.id)
          : await reactions.insert({ discussion_id: discussionId, kind });
    setBusy(false);
    if (error) {
      setState(before);
      toast('Couldn’t save your reaction. Try again.', { tone: 'error' });
    }
  }

  async function share() {
    const url = `${window.location.origin}/community/${discussionId}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
      } catch {
        // Closing the share sheet is not an error.
      }
      return;
    }
    navigator.clipboard.writeText(url).then(
      () => toast('Link copied.', { tone: 'success' }),
      () => toast(url)
    );
  }

  return (
    <div className={styles.reactions} role="group" aria-label="Reactions" aria-busy={busy || undefined}>
      <button type="button" className={styles.reaction} aria-pressed={state.mine === 'like'} disabled={busy} onClick={() => void react('like')} title="Like">
        <IconThumbsUp size={14} />
        <span className={styles.reactionCount}>{state.likes}</span>
        <span className="visually-hidden"> {state.likes === 1 ? 'like' : 'likes'}</span>
      </button>
      <button type="button" className={styles.reaction} aria-pressed={state.mine === 'dislike'} disabled={busy} onClick={() => void react('dislike')} title="Dislike">
        <IconThumbsDown size={14} />
        <span className={styles.reactionCount}>{state.dislikes}</span>
        <span className="visually-hidden"> {state.dislikes === 1 ? 'dislike' : 'dislikes'}</span>
      </button>
      <button type="button" className={styles.reaction} onClick={() => void share()}>
        <IconShare size={14} />
        Share
      </button>
    </div>
  );
}
