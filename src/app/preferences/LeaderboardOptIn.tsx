'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BANNERS } from '@/lib/member-card';
import type { ProfileBanner } from '@/types/database';
import MemberBanner from '@/components/MemberBanner';
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

  const onBanner = async (banner: ProfileBanner | null) => {
    setSaving(true);
    const { error } = await updateProfile({ profile_banner: banner });
    setSaving(false);
    if (error) toast(error, { tone: 'error' });
    else toast(banner ? 'Banner saved to your profile' : 'Banner removed', { tone: 'success' });
  };

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
      {profile.show_on_leaderboard && 'profile_banner' in profile && (
        <fieldset className={styles.banners}>
          <legend className={styles.bannersLegend}>Profile banner</legend>
          <p className={styles.accountBody}>Shown at the top of your public profile while you’re on the leaderboard.</p>
          <div className={styles.bannerOptions}>
            <label className={styles.bannerOption}>
              <input type="radio" name="profile-banner" checked={!profile.profile_banner} disabled={saving} onChange={() => void onBanner(null)} />
              <span className={styles.bannerNone} aria-hidden="true" />
              None
            </label>
            {BANNERS.map(banner => (
              <label key={banner.id} className={styles.bannerOption}>
                <input
                  type="radio"
                  name="profile-banner"
                  checked={profile.profile_banner === banner.id}
                  disabled={saving}
                  onChange={() => void onBanner(banner.id)}
                />
                <MemberBanner banner={banner.id} className={styles.bannerPreview} />
                {banner.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </Panel>
  );
}
