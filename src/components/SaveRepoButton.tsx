'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useSignIn } from './auth/SignIn';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { Repository } from '@/types';
import { useToast } from './ui/Toast';
import { Button } from './ui/Button';
import { IconBookmark } from './icons';

export default function SaveRepoButton({ repo, label = false }: { repo: Repository; label?: boolean }) {
  const { user } = useAuth();
  const { openSignIn } = useSignIn();
  const { getSavedRepo, saveRepo, unsaveRepo } = useWorkspace();
  const { toast } = useToast();
  const saved = user ? getSavedRepo(repo.full_name) : undefined;

  const onClick = async () => {
    if (!user) {
      toast('Sign in to save repositories.', {
        action: { label: 'Sign in', onClick: () => openSignIn() },
      });
      return;
    }
    if (saved) {
      if (await unsaveRepo(saved.id)) toast('Removed from saved repositories');
    } else if (await saveRepo(repo)) {
      toast('Saved to your workspace', { tone: 'success' });
    }
  };

  const text = saved ? 'Saved' : 'Save';
  return (
    <Button
      variant="secondary"
      size="sm"
      iconOnly={!label}
      onClick={onClick}
      aria-pressed={Boolean(saved)}
      aria-label={label ? undefined : saved ? `Unsave ${repo.full_name}` : `Save ${repo.full_name}`}
      title={saved ? 'Remove from saved' : 'Save repository'}
    >
      <IconBookmark size={14} filled={Boolean(saved)} />
      {label && text}
    </Button>
  );
}
