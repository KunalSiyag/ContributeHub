'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useSignIn } from '@/components/auth/SignIn';
import { Button, ButtonLink } from '@/components/ui/Button';
import { IconPlus } from '@/components/icons';

/** "Start a discussion": straight to the form when signed in, sign-in first otherwise. */
export default function StartDiscussion() {
  const { user, loading } = useAuth();
  const { openSignIn } = useSignIn();
  if (user) {
    return (
      <ButtonLink href="/community/new" variant="primary">
        <IconPlus size={14} />
        Start a discussion
      </ButtonLink>
    );
  }
  return (
    <Button variant="primary" onClick={() => openSignIn('/community/new')} disabled={loading}>
      <IconPlus size={14} />
      Start a discussion
    </Button>
  );
}
