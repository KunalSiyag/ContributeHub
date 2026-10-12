'use client';

import { useState } from 'react';
import { fetchJson, ApiError } from '@/lib/fetch-json';
import { Button } from '@/components/ui/Button';
import { Notice, Tag } from '@/components/ui/primitives';
import { IconSparkles } from '@/components/icons';
import styles from './IssueDetail.module.css';

interface Suggestion {
  summary: string;
  steps: string[];
  skills: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  timeEstimate: string;
}

type Result = { available: true; model: string; suggestion: Suggestion } | { available: false; reason: string };

interface ApproachPanelProps {
  aiEnabled: boolean;
  issue: { title: string; body: string; labels: string[]; repo: string };
}

/** On-demand AI draft of how to approach the issue. Never shown as fact. */
export default function ApproachPanel({ aiEnabled, issue }: ApproachPanelProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!aiEnabled) return null;

  const run = async () => {
    setState('loading');
    setError(null);
    try {
      const data = await fetchJson<Result>('/api/issues/ai-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issue),
      });
      setResult(data);
      setState('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the AI service.');
      setState('error');
    }
  };

  return (
    <section aria-labelledby="approach-heading" className={styles.approach} aria-live="polite">
      <div className={styles.approachHead}>
        <div>
          <h2 id="approach-heading" className={styles.sectionTitle}>
            Plan an approach
          </h2>
          <p className={styles.approachHint}>An AI draft from the issue text. Verify it against the code before relying on it.</p>
        </div>
        {state !== 'done' && (
          <Button variant="secondary" size="sm" onClick={run} loading={state === 'loading'}>
            <IconSparkles size={13} />
            {state === 'error' ? 'Try again' : 'Draft with AI'}
          </Button>
        )}
      </div>

      {state === 'error' && error && <Notice tone="warning">{error}</Notice>}

      {state === 'done' && result && !result.available && (
        <Notice tone="warning">The AI model did not return a usable draft for this issue. Read the discussion on GitHub instead.</Notice>
      )}

      {state === 'done' && result && result.available && (
        <div className={styles.approachBody}>
          <p className={styles.approachSummary}>{result.suggestion.summary}</p>
          <ol className={styles.approachSteps}>
            {result.suggestion.steps.map(step => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className={styles.approachMeta}>
            <Tag tone="muted">Difficulty: {result.suggestion.difficulty}</Tag>
            {result.suggestion.timeEstimate && <Tag tone="muted">Estimate: {result.suggestion.timeEstimate}</Tag>}
            {result.suggestion.skills.map(skill => (
              <Tag key={skill}>{skill}</Tag>
            ))}
          </div>
          <p className={styles.approachFoot}>Drafted by {result.model}. It has not seen the repository&rsquo;s code.</p>
        </div>
      )}
    </section>
  );
}
