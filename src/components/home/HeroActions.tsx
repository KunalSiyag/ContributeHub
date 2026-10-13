'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useSignIn } from '../auth/SignIn';
import { Button, ButtonLink } from '../ui/Button';
import { IconArrowRight } from '../icons';

export default function HeroActions({ size = 'lg' }: { size?: 'md' | 'lg' }) {
  const { user, loading } = useAuth();
  const { openSignIn } = useSignIn();

  return (
    <>
      {user ? (
        <ButtonLink href="/dashboard" variant="primary" size={size} pill>
          Open your workspace
          <IconArrowRight size={14} />
        </ButtonLink>
      ) : (
        <Button variant="primary" size={size} pill onClick={() => openSignIn('/dashboard')} disabled={loading}>
          Get started
          <IconArrowRight size={14} />
        </Button>
      )}
      <ButtonLink href="/discover" variant="secondary" size={size} pill>
        Explore issues
      </ButtonLink>
    </>
  );
}
