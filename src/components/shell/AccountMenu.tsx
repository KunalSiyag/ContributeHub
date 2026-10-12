'use client';

import { useAuth } from '@/contexts/AuthContext';
import { avatarOf, displayNameOf } from '@/lib/identity';
import { useSignIn } from '../auth/SignIn';
import { Menu } from '../ui/Menu';
import { Button } from '../ui/Button';
import { Avatar, Skeleton } from '../ui/primitives';
import { IconChevronUpDown, IconLogIn, IconLogOut, IconSettings, IconArrowUpRight } from '../icons';
import styles from './Shell.module.css';

interface AccountMenuProps {
  /** `row` fills the sidebar footer; `compact` is an avatar button for top bars. */
  variant?: 'row' | 'compact';
}

export default function AccountMenu({ variant = 'row' }: AccountMenuProps) {
  const { user, profile, githubLogin: login, loading, signOut } = useAuth();
  const { openSignIn } = useSignIn();

  if (loading) {
    return variant === 'row' ? (
      <div className={styles.accountRow} aria-hidden="true">
        <Skeleton width={24} height={24} radius={999} />
        <Skeleton width={96} height={10} />
      </div>
    ) : (
      <Skeleton width={28} height={28} radius={999} />
    );
  }

  if (!user) {
    return (
      <Button
        variant={variant === 'row' ? 'secondary' : 'primary'}
        size={variant === 'row' ? 'md' : 'sm'}
        full={variant === 'row'}
        onClick={() => openSignIn()}
      >
        <IconLogIn size={14} />
        Sign in
      </Button>
    );
  }

  const name = profile?.full_name || displayNameOf(user) || login || 'Contributor';
  const avatar = profile?.avatar_url || avatarOf(user);
  // Google accounts have no GitHub handle until they add one; show their email instead.
  const handle = login ? `@${login}` : user.email ?? null;

  return (
    <Menu
      align={variant === 'row' ? 'start' : 'end'}
      label="Account"
      items={[
        { type: 'label', label: handle ?? name },
        { label: 'Preferences', icon: <IconSettings size={14} />, href: '/preferences' },
        ...(login
          ? [
              {
                label: 'GitHub profile',
                icon: <IconArrowUpRight size={14} />,
                href: `https://github.com/${login}`,
                external: true,
              },
            ]
          : []),
        { type: 'separator' },
        { label: 'Sign out', icon: <IconLogOut size={14} />, onSelect: () => signOut() },
      ]}
      trigger={props =>
        variant === 'row' ? (
          <button type="button" className={styles.accountRow} {...props}>
            <Avatar src={avatar} name={name} size={24} />
            <span className={styles.accountText}>
              <span className={styles.accountName}>{name}</span>
              {handle && <span className={styles.accountLogin}>{handle}</span>}
            </span>
            <IconChevronUpDown size={14} className={styles.accountChevron} />
          </button>
        ) : (
          <button type="button" className={styles.accountCompact} aria-label="Account menu" {...props}>
            <Avatar src={avatar} name={name} size={28} />
          </button>
        )
      }
    />
  );
}
