'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SignInOptions } from './auth/SignIn';
import { Notice } from './ui/primitives';
import { IconArrowRight, IconLock } from './icons';
import styles from './SignInGate.module.css';

interface SignInGateProps {
  title: string;
  description: ReactNode;
  /** Short list of what the user gets after signing in. */
  points?: string[];
  next?: string;
}

/** Shown on workspace pages when nobody is signed in. */
export default function SignInGate({ title, description, points = [], next }: SignInGateProps) {
  const { configured } = useAuth();

  return (
    <section className={styles.gate} aria-labelledby="gate-title">
      <span className={styles.icon} aria-hidden="true">
        <IconLock size={16} />
      </span>
      <h2 id="gate-title" className={styles.title}>
        {title}
      </h2>
      <p className={styles.description}>{description}</p>
      {points.length > 0 && (
        <ul className={styles.points}>
          {points.map(point => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}
      {configured ? (
        <>
          <div className={styles.actions}>
            <SignInOptions next={next} />
          </div>
          <Link href="/discover" className={styles.browse}>
            Or browse issues first
            <IconArrowRight size={12} />
          </Link>
        </>
      ) : (
        <Notice tone="warning" title="Sign-in is not configured">
          Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable accounts.
        </Notice>
      )}
      <p className={styles.fine}>Orion reads public GitHub data only. It never writes to your repositories.</p>
    </section>
  );
}
