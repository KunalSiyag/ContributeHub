'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/Field';
import { Panel } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import styles from './page.module.css';

/**
 * Consent for the public leaderboard. Off by default; hidden until the
 * database has the setting (migration 07).
 */
export default function LeaderboardOptIn() {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const headingId = useId();
  const [saving, setSaving] = useState(false);
  if (!user || !profile || !('show_on_leaderboard' in profile)) return null;

  const onChange = async (next: boolean) => {
    setSaving(true);
    const { error } = await updateProfile({ show_on_leaderboard: next });
    setSaving(false);
    if (error) toast(error, { tone: 'error' });
    else toast(next ? 'You’re on the leaderboard' : 'Removed from the leaderboard', { tone: next ? 'success' : undefined });
  };

  return (
    <Panel>
      <section className={styles.account} aria-labelledby={headingId}>
        <div className={styles.accountText}>
          <h2 id={headingId} className={styles.accountTitle}>
            Community leaderboard
          </h2>
          <p className={styles.accountBody}>
            Show your name, avatar and merged pull requests from the last 30 days on the{' '}
            <Link href="/leaderboard">public leaderboard</Link>. Needs a GitHub username; you can switch it off any time.
          </p>
        </div>
        <Checkbox
          label="Show me on the leaderboard"
          checked={Boolean(profile.show_on_leaderboard)}
          disabled={saving || !profile.github_username}
          onChange={event => void onChange(event.target.checked)}
        />
      </section>
    </Panel>
  );
}
