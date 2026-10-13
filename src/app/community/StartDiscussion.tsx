'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useSignIn } from '@/components/auth/SignIn';
import { Button, ButtonLink } from '@/components/ui/Button';
import { IconPlus } from '@/components/icons';

/**
 * "Start a discussion": straight to the form when signed in, sign-in first
 * otherwise. A second copy in the same view (the empty list) is secondary, so
 * the page keeps one primary action.
 */
export default function StartDiscussion({ variant = 'primary' }: { variant?: 'primary' | 'secondary' }) {
  const { user, loading } = useAuth();
  const { openSignIn } = useSignIn();
  if (user) {
    return (
      <ButtonLink href="/community/new" variant={variant}>
        <IconPlus size={14} />
        Start a discussion
      </ButtonLink>
    );
  }
  return (
    <Button variant={variant} onClick={() => openSignIn('/community/new')} disabled={loading}>
      <IconPlus size={14} />
      Start a discussion
    </Button>
  );
}
