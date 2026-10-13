'use client';

import { useId, useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { githubLoginOf, isGitHubUsername, normalizeGitHubInput } from '@/lib/identity';
import { ApiError, fetchJson } from '@/lib/fetch-json';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Avatar, Panel } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { IconArrowUpRight } from '@/components/icons';
import styles from './page.module.css';

/**
 * The GitHub handle behind pull requests and the contribution calendar.
 * Fixed for GitHub sign-ins; editable for accounts that signed in another way.
 */
export default function GitHubAccount() {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const headingId = useId();
  const inputId = useId();
  const errorId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) return null;
  const linked = githubLoginOf(user);
  const saved = profile?.github_username ?? '';
  const value = draft ?? saved;
  const unchanged = normalizeGitHubInput(value) === saved;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || unchanged) return;
    const login = normalizeGitHubInput(value);
    if (login && !isGitHubUsername(login)) {
      setError('Use the name from your GitHub profile URL: letters, numbers and single hyphens.');
      return;
    }

    setSaving(true);
    setError(null);
    let canonical = login || null;
    let unverified = false;
    if (login) {
      try {
        const found = await fetchJson<{ login: string }>(`/api/github/user?username=${encodeURIComponent(login)}`);
        canonical = found.login;
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setError(`No GitHub account is named ${login}.`);
          setSaving(false);
          return;
        }
        // GitHub unreachable or rate limited: keep what was typed.
        unverified = true;
      }
    }

    const { error: saveError } = await updateProfile({ github_username: canonical });
    setSaving(false);
    if (saveError) {
      toast(saveError, { tone: 'error' });
      return;
    }
    setDraft(null);
    if (!canonical) toast('GitHub username removed');
    else if (unverified) toast(`Saved @${canonical}. GitHub couldn’t be reached to confirm it.`);
    else toast(`Linked @${canonical}`, { tone: 'success' });
  };

  return (
    <Panel>
      <section className={styles.account} aria-labelledby={headingId}>
        <div className={styles.accountText}>
          <h2 id={headingId} className={styles.accountTitle}>
            GitHub account
          </h2>
          <p className={styles.accountBody}>
            {linked
              ? 'Linked through your GitHub sign-in.'
              : 'Add your username to see your pull requests and contribution calendar on the overview. Orion reads public data only.'}
          </p>
        </div>

        {linked ? (
          <a href={`https://github.com/${linked}`} target="_blank" rel="noopener noreferrer" className={styles.accountLink}>
            <Avatar src={`https://github.com/${linked}.png?size=40`} name={linked} size={20} />@{linked}
            <IconArrowUpRight size={12} />
          </a>
        ) : (
          <form onSubmit={onSubmit} className={styles.accountForm} noValidate>
            <label htmlFor={inputId} className="visually-hidden">
              GitHub username
            </label>
            <Input
              id={inputId}
              icon={<span aria-hidden="true">@</span>}
              value={value}
              placeholder="octocat"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              wrapperClassName={styles.accountInput}
              onChange={event => {
                setDraft(event.target.value);
                setError(null);
              }}
            />
            <Button type="submit" variant="secondary" loading={saving} disabled={unchanged}>
              Save
            </Button>
            {error && (
              <p id={errorId} className={styles.accountError} role="alert">
                {error}
              </p>
            )}
          </form>
        )}
      </section>
    </Panel>
  );
}
