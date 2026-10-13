'use client';

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSkills } from '@/hooks/useSkills';
import SkillsForm, { sameSkills } from '@/components/SkillsForm';
import { Button } from '@/components/ui/Button';
import { Notice, PageHeader, Panel } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { IconArrowLeft, IconCheck } from '@/components/icons';
import { EMPTY_SKILLS, hasSkills, type SkillProfile } from '@/lib/matching';
import StepIndicator from './StepIndicator';
import UploadStep from './UploadStep';
import MatchesStep from './MatchesStep';
import {
  DEFAULT_MAX_BYTES,
  canSearch,
  plural,
  profileFromAnalysis,
  type MatchState,
  type RecommendedIssue,
  type ResumeResult,
  type SkillSource,
  type Step,
  type UploadConfig,
} from './flow';
import styles from './page.module.css';

const resultsMessage = (count: number) =>
  count === 0 ? 'No open issues matched these skills.' : `${plural(count, 'issue')} found, ranked by fit.`;

export default function ResumeClient() {
  const { user } = useAuth();
  const { skills: saved, hasSkills: hasSaved, ready, save } = useSkills();
  const { toast } = useToast();
  const reviewTitleId = useId();
  const findHintId = useId();

  const [step, setStep] = useState<Step>('upload');
  const [draft, setDraft] = useState<SkillProfile>(EMPTY_SKILLS);
  const [source, setSource] = useState<SkillSource | null>(null);
  const [foundNothing, setFoundNothing] = useState(false);
  const [matches, setMatches] = useState<MatchState>({ status: 'idle' });
  const [config, setConfig] = useState<UploadConfig | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const headingRef = useRef<HTMLHeadingElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moveFocus = useRef(false);
  const searchRef = useRef<AbortController | null>(null);

  // Upload limit and whether the AI option exists on this deployment.
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/resume', { signal: controller.signal })
      .then(response => (response.ok ? response.json() : null))
      .then((data: Partial<UploadConfig> | null) => {
        setConfig({
          aiConfigured: data?.aiConfigured === true,
          maxBytes: typeof data?.maxBytes === 'number' && data.maxBytes > 0 ? data.maxBytes : DEFAULT_MAX_BYTES,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setConfig({ aiConfigured: false, maxBytes: DEFAULT_MAX_BYTES });
      });
    return () => controller.abort();
  }, []);

  // After a step change, land keyboard and screen reader users on the new step.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    (step === 'upload' ? fileInputRef.current : headingRef.current)?.focus();
  }, [step]);

  useEffect(() => {
    const search = searchRef;
    return () => search.current?.abort();
  }, []);

  const goTo = (next: Step, message: string) => {
    moveFocus.current = true;
    setStep(next);
    setAnnouncement(message);
  };

  const runSearch = useCallback(async (query: SkillProfile) => {
    searchRef.current?.abort();
    const controller = new AbortController();
    searchRef.current = controller;
    setMatches({ status: 'loading', query });

    try {
      const response = await fetch('/api/issues/recommended', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          languages: query.languages,
          technologies: query.technologies,
          interests: query.interests,
          experienceLevel: query.experienceLevel,
        }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (controller.signal.aborted) return;

      if (!response.ok || !data || !Array.isArray(data.items)) {
        const message = typeof data?.message === 'string' ? data.message : 'The search didn’t finish. Try again.';
        setMatches({ status: 'error', query, message });
        return;
      }

      const items = data.items as RecommendedIssue[];
      setMatches({
        status: 'done',
        query,
        items,
        total: typeof data.total_count === 'number' ? data.total_count : items.length,
        languages: Array.isArray(data.languages) ? data.languages.filter((v: unknown) => typeof v === 'string') : [],
        partial: data.partial === true,
      });
      setAnnouncement(resultsMessage(items.length));
    } catch {
      if (controller.signal.aborted) return;
      setMatches({ status: 'error', query, message: 'Couldn’t reach the server. Check your connection and try again.' });
    } finally {
      if (searchRef.current === controller) searchRef.current = null;
    }
  }, []);

  const showMatches = (query: SkillProfile) => {
    if (matches.status === 'done' && sameSkills(matches.query, query)) {
      goTo('matches', `Step 3 of 3, Matches. ${resultsMessage(matches.items.length)}`);
      return;
    }
    goTo('matches', 'Step 3 of 3, Matches. Searching GitHub for open issues…');
    void runSearch(query);
  };

  const onAnalyzed = (result: ResumeResult, fileName: string) => {
    const next = profileFromAnalysis(result.analysis);
    setDraft(next);
    setSource({ kind: 'resume', fileName, ai: result.ai });
    setFoundNothing(!hasSkills(next));
    const found = next.languages.length + next.technologies.length;
    goTo(
      'review',
      found > 0
        ? `Step 2 of 3, Review skills. Found ${plural(next.languages.length, 'language')} and ${plural(next.technologies.length, 'tool')}.`
        : 'Step 2 of 3, Review skills. No languages or tools were found in this file.'
    );
  };

  const startWithSaved = () => {
    setDraft(saved);
    setSource({ kind: 'saved' });
    setFoundNothing(false);
    if (canSearch(saved)) showMatches(saved);
    else goTo('review', 'Step 2 of 3, Review skills. Add a language or a framework to search.');
  };

  const editSkills = () => {
    if (matches.status === 'loading') {
      searchRef.current?.abort();
      setMatches({ status: 'idle' });
    }
    goTo('review', 'Step 2 of 3, Review skills.');
  };

  const onFind = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSearch(draft)) showMatches(draft);
  };

  const saveDraft = async () => {
    const previous = saved;
    const hadSaved = hasSaved;
    setSavingSkills(true);
    let error: string | null;
    try {
      ({ error } = await save(draft));
    } catch {
      error = 'Couldn’t save your skills. Try again.';
    } finally {
      setSavingSkills(false);
    }
    if (error) {
      toast(error, { tone: 'error' });
      return;
    }
    toast(user ? 'Skills saved to your profile' : 'Skills saved on this device', {
      tone: 'success',
      // Saving replaces the stored skills, so offer a way back.
      action: hadSaved
        ? {
            label: 'Undo',
            onClick: () => {
              save(previous)
                .then(({ error: undoError }) =>
                  toast(undoError ?? 'Restored your previous skills', { tone: undoError ? 'error' : 'default' })
                )
                .catch(() => toast('Couldn’t restore your previous skills.', { tone: 'error' }));
            },
          }
        : undefined,
    });
  };

  const searchable = canSearch(draft);
  const draftSaved = ready && hasSkills(draft) && sameSkills(draft, saved);

  let reviewCaption = 'Changes here apply to this search unless you save them.';
  if (source?.kind === 'resume') {
    const how = source.ai.used
      ? 'Found with keyword matching and Gemini.'
      : source.ai.requested
        ? 'AI was unavailable, so only keyword matching was used.'
        : 'Found with keyword matching.';
    reviewCaption = `${how} Review and edit before matching.`;
  }

  return (
    <>
      <PageHeader
        eyebrow="Grow"
        title="Resume match"
        description="Upload a resume to pull out your languages and tools, then see open issues that fit them."
      />

      <div className={styles.flow}>
        <StepIndicator current={step} />
        <p className="visually-hidden" role="status" aria-live="polite">
          {announcement}
        </p>

        {step === 'upload' && (
          <UploadStep
            inputRef={fileInputRef}
            config={config}
            aiEnabled={aiEnabled}
            onAiChange={setAiEnabled}
            onAnalyzed={onAnalyzed}
            onAnnounce={setAnnouncement}
            saved={ready && hasSaved ? saved : null}
            onUseSaved={startWithSaved}
          />
        )}

        {step === 'review' && (
          <section key="review" className={styles.step} aria-labelledby={reviewTitleId}>
            <header className={styles.stepHead}>
              <h2 id={reviewTitleId} ref={headingRef} tabIndex={-1} className={styles.stepTitle}>
                {source?.kind === 'resume' ? (
                  <>
                    Skills found in <span className={styles.fileName}>{source.fileName}</span>
                  </>
                ) : (
                  'Your saved skills'
                )}
              </h2>
              <p className={styles.stepCaption}>{reviewCaption}</p>
            </header>

            {foundNothing && (
              <Notice title="No languages or tools found in this file">
                {config?.aiConfigured && source?.kind === 'resume' && !source.ai.requested
                  ? 'Add them below, or go back and try again with AI extraction turned on.'
                  : 'Add them below to find matching issues.'}
              </Notice>
            )}

            <Panel>
              <form onSubmit={onFind} aria-labelledby={reviewTitleId} noValidate>
                <div className={styles.panelBody}>
                  <SkillsForm value={draft} onChange={setDraft} idPrefix="resume" />
                </div>

                <div className={`${styles.footer} ${styles.footerSticky}`}>
                  <Button
                    variant="ghost"
                    className={styles.edgeStart}
                    onClick={() => goTo('upload', 'Step 1 of 3, Upload.')}
                  >
                    <IconArrowLeft size={14} />
                    {source?.kind === 'resume' ? 'Upload a different file' : 'Upload a resume instead'}
                  </Button>
                  <div className={styles.footerActions}>
                    {!searchable && (
                      <p id={findHintId} className={styles.footerHint}>
                        Add a language or a framework to find matches.
                      </p>
                    )}
                    <Button
                      variant="secondary"
                      onClick={saveDraft}
                      loading={savingSkills}
                      disabled={!ready || !hasSkills(draft) || draftSaved}
                    >
                      {draftSaved ? (
                        <>
                          <IconCheck size={14} className={styles.savedIcon} />
                          Saved to my skills
                        </>
                      ) : (
                        'Save to my skills'
                      )}
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={!searchable}
                      aria-describedby={searchable ? undefined : findHintId}
                    >
                      Find matching issues
                    </Button>
                  </div>
                </div>
              </form>
            </Panel>
          </section>
        )}

        {step === 'matches' && matches.status !== 'idle' && (
          <MatchesStep
            state={matches}
            headingRef={headingRef}
            onEdit={editSkills}
            onRetry={() => {
              setAnnouncement('Searching GitHub again…');
              void runSearch(matches.query);
            }}
          />
        )}
      </div>
    </>
  );
}
