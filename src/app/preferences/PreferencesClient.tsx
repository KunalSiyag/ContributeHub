'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSignIn } from '@/components/auth/SignIn';
import { useSkills } from '@/hooks/useSkills';
import SkillsForm, { SkillsFormSkeleton, sameSkills } from '@/components/SkillsForm';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PageHeader, Panel } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { IconCheck, IconLogIn, IconUpload } from '@/components/icons';
import type { SkillProfile } from '@/lib/matching';
import GitHubAccount from './GitHubAccount';
import LeaderboardOptIn from './LeaderboardOptIn';
import styles from './page.module.css';

export default function PreferencesClient() {
  const { user, configured } = useAuth();
  const { openSignIn } = useSignIn();
  const { skills, ready, save } = useSkills();
  const { toast } = useToast();
  const importId = useId();

  const [draft, setDraft] = useState<SkillProfile | null>(null);
  const [synced, setSynced] = useState<SkillProfile | null>(null);
  const [saving, setSaving] = useState(false);

  // Adopt stored skills once they load, and again when they change elsewhere
  // (a save, another tab) — but never over edits the user hasn't saved.
  if (ready && skills !== synced) {
    setSynced(skills);
    if (draft === null || (synced !== null && sameSkills(draft, synced))) setDraft(skills);
  }

  const dirty = draft !== null && !sameSkills(draft, skills);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers only prompt when returnValue is set.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || !dirty || saving) return;
    setSaving(true);
    try {
      const { error } = await save(draft);
      if (error) toast(error, { tone: 'error' });
      else toast('Preferences saved', { tone: 'success' });
    } catch {
      toast('Couldn’t save your preferences. Try again.', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const showSignIn = !user && configured && !dirty;

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Preferences"
        description="Your skills drive match scores in Discover and recommendations on your overview."
      />

      <div className={styles.layout}>
        <GitHubAccount />
        <LeaderboardOptIn />

        {draft === null ? (
          <Panel aria-busy="true">
            <div className={styles.panelBody}>
              <SkillsFormSkeleton />
            </div>
            <div className={styles.footer} aria-hidden="true" />
            <p className="visually-hidden" role="status">
              Loading your preferences…
            </p>
          </Panel>
        ) : (
          <Panel>
            <form onSubmit={onSubmit} aria-label="Your skills" noValidate>
              <div className={styles.panelBody}>
                <SkillsForm value={draft} onChange={setDraft} idPrefix="preferences" />
              </div>

              <div className={styles.footer}>
                <div className={styles.statusArea}>
                  <p className={styles.status} role="status">
                    {dirty ? (
                      <>
                        <span className={styles.dirtyDot} aria-hidden="true" />
                        Unsaved changes
                      </>
                    ) : user ? (
                      <>
                        <IconCheck size={14} className={styles.savedIcon} />
                        Saved to your profile
                      </>
                    ) : configured ? (
                      'Saved on this device. Sign in to sync across devices.'
                    ) : (
                      'Saved on this device.'
                    )}
                  </p>
                  {showSignIn && (
                    <Button variant="ghost" size="sm" onClick={() => openSignIn()}>
                      <IconLogIn size={13} />
                      Sign in
                    </Button>
                  )}
                </div>

                <div className={styles.actions}>
                  <Button variant="ghost" onClick={() => setDraft(skills)} disabled={!dirty || saving}>
                    Reset
                  </Button>
                  <Button type="submit" variant="primary" disabled={!dirty} loading={saving}>
                    Save preferences
                  </Button>
                </div>
              </div>
            </form>
          </Panel>
        )}

        <section className={styles.import} aria-labelledby={importId}>
          <div className={styles.importText}>
            <h2 id={importId} className={styles.importTitle}>
              Import from your resume
            </h2>
            <p className={styles.importBody}>
              Pull languages and tools out of a PDF or DOCX, then review them before anything is saved.
            </p>
          </div>
          <ButtonLink href="/resume" variant="secondary">
            <IconUpload size={14} />
            Upload a resume
          </ButtonLink>
        </section>
      </div>
    </>
  );
}
