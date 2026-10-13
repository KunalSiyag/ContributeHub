'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PROVIDER_LABEL, useAuthProviders, type OAuthProvider } from '@/hooks/useAuthProviders';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { IconGithub, IconGoogle } from '../icons';
import styles from './SignIn.module.css';

const PROVIDER_ICON: Record<OAuthProvider, ReactNode> = {
  github: <IconGithub size={15} />,
  google: <IconGoogle size={15} />,
};

interface SignInOptionsProps {
  /** Path to land on after signing in; defaults to the current page. */
  next?: string;
  /** Full-width buttons in a column (dialogs) instead of inline buttons. */
  stacked?: boolean;
  /** Runs right before the redirect, e.g. to clear stale auth cookies. */
  onBeforeSignIn?: () => void;
}

/** One "Continue with …" button per sign-in provider enabled in Supabase. */
export function SignInOptions({ next, stacked = false, onBeforeSignIn }: SignInOptionsProps) {
  const { signIn } = useAuth();
  const providers = useAuthProviders();
  const [pending, setPending] = useState<OAuthProvider | null>(null);

  useEffect(() => {
    // The back button can restore this page from cache mid-redirect; drop the spinner.
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(null);
    };
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);

  const start = async (provider: OAuthProvider) => {
    setPending(provider);
    onBeforeSignIn?.();
    const redirecting = await signIn(provider, next);
    if (!redirecting) setPending(null);
  };

  const buttons = providers.map((provider, index) => (
    <Button
      key={provider}
      variant={index === 0 ? 'primary' : 'secondary'}
      size={stacked ? 'lg' : 'md'}
      full={stacked}
      loading={pending === provider}
      disabled={pending !== null && pending !== provider}
      onClick={() => start(provider)}
    >
      {PROVIDER_ICON[provider]}
      Continue with {PROVIDER_LABEL[provider]}
    </Button>
  ));

  return stacked ? <div className={styles.stack}>{buttons}</div> : <>{buttons}</>;
}

interface SignInContextValue {
  /** Opens the provider chooser, or goes straight to the only provider. */
  openSignIn: (next?: string) => void;
}

const SignInContext = createContext<SignInContextValue>({ openSignIn: () => {} });

export function SignInProvider({ children }: { children: ReactNode }) {
  const { signIn } = useAuth();
  const providers = useAuthProviders();
  const [request, setRequest] = useState<{ next?: string } | null>(null);

  const openSignIn = useCallback(
    (next?: string) => {
      if (providers.length === 1) {
        void signIn(providers[0], next);
        return;
      }
      setRequest({ next });
    },
    [providers, signIn]
  );

  const value = useMemo(() => ({ openSignIn }), [openSignIn]);

  return (
    <SignInContext.Provider value={value}>
      {children}
      <Dialog
        open={request !== null}
        onClose={() => setRequest(null)}
        title="Sign in to Orion"
        description="Your tracker, skills and saved repositories, on every device."
      >
        <SignInOptions next={request?.next} stacked />
        <p className={styles.fine}>Orion reads public GitHub data only. It never writes to your repositories.</p>
      </Dialog>
    </SignInContext.Provider>
  );
}

export function useSignIn() {
  return useContext(SignInContext);
}
