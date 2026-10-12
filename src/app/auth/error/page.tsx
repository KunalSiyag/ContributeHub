import type { Metadata } from 'next';
import Link from 'next/link';
import { Notice } from '@/components/ui/primitives';
import { buttonClass } from '@/components/ui/Button';
import RetrySignIn from './RetrySignIn';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Sign-in problem',
  robots: { index: false },
};

const KNOWN_ERRORS: Record<string, string> = {
  missing_code: 'GitHub sent you back without an authorization code. This usually means the sign-in was cancelled.',
  access_denied: 'GitHub access was denied. Authorize the Orion app on GitHub to continue.',
  expired: 'This sign-in link expired or was already used. Start again and finish signing in within a few minutes.',
  other_browser:
    'Sign-in started in a different browser, or this site’s cookies were cleared along the way. Start again from this browser.',
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; detail?: string }>;
}) {
  const { error, detail } = await searchParams;
  const known = error ? KNOWN_ERRORS[error] : undefined;
  // Older links carried the raw message in `error`; show it as a detail.
  const technical = detail ?? (error && !known && error !== 'unknown' ? error : undefined);

  return (
    <div className={styles.wrap}>
      <span className="eyebrow">Sign in</span>
      <h1 className={styles.title}>We couldn&rsquo;t sign you in</h1>
      <Notice tone="danger" title="What happened">
        {known ?? 'Something interrupted the sign-in flow.'}
        {technical && (
          <details className={styles.technical}>
            <summary>Technical details</summary>
            <span className={styles.detail}>{technical.slice(0, 300)}</span>
          </details>
        )}
      </Notice>
      <p className={styles.help}>
        Try again. If it keeps failing, clear this site&rsquo;s cookies or use a private window, then sign in once more.
      </p>
      <div className={styles.actions}>
        <RetrySignIn />
        <Link href="/" className={buttonClass({ variant: 'ghost' })}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
