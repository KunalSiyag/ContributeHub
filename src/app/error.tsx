'use client';

import Link from 'next/link';
import { Button, buttonClass } from '@/components/ui/Button';
import styles from './error.module.css';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className={styles.wrap} role="alert">
      <span className="eyebrow">Error</span>
      <h1 className={styles.title}>This page failed to load</h1>
      <p className={styles.body}>
        Something went wrong on our side. Try again; if it keeps happening, the GitHub API may be unavailable.
      </p>
      {error.digest && <p className={styles.digest}>Reference {error.digest}</p>}
      <div className={styles.actions}>
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <Link href="/" className={buttonClass({ variant: 'secondary' })}>
          Go home
        </Link>
      </div>
    </div>
  );
}
