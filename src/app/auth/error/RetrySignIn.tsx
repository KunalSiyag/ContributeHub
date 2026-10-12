'use client';

import { SignInOptions } from '@/components/auth/SignIn';

/** Stale PKCE verifiers are the usual cause of a failed sign-in; clear Supabase cookies first. */
function clearAuthCookies() {
  document.cookie.split(';').forEach(entry => {
    const name = entry.split('=')[0].trim();
    if (name.startsWith('sb-')) document.cookie = `${name}=; path=/; max-age=0`;
  });
}

export default function RetrySignIn() {
  return <SignInOptions next="/dashboard" onBeforeSignIn={clearAuthCookies} />;
}
