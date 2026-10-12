'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import Markdown from '@/components/Markdown';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/primitives';
import { IconArrowRight, IconRefreshCw, IconSparkles } from '@/components/icons';
import LogoMark from '@/components/LogoMark';
import styles from './assistant.module.css';

interface Turn {
  role: 'user' | 'model';
  text: string;
}

const SUGGESTIONS = [
  'Which open source programs can I still apply to this year?',
  'Explain zulip/zulip and where a newcomer should start',
  'How do I write a strong GSoC proposal?',
  'How do I pick my first issue and ask to work on it?',
];

export default function AssistantClient({ initialRepo }: { initialRepo: string | null }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || pending) return;
    const next = [...turns, { role: 'user' as const, text }];
    setTurns(next);
    setDraft('');
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await response.json()) as { available?: boolean; reply?: string; message?: string };
      if (!response.ok) throw new Error(data.message ?? 'The assistant could not answer.');
      if (!data.available || !data.reply) throw new Error('The assistant is unavailable right now. Try again in a moment.');
      setTurns(current => [...current, { role: 'model', text: data.reply! }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The assistant could not answer.');
      // Give the question back so it can be retried as is.
      setTurns(current => current.slice(0, -1));
      setDraft(text);
    } finally {
      setPending(false);
    }
  };

  // Opened from a repository report: start with that repository.
  useEffect(() => {
    if (!initialRepo || started.current) return;
    started.current = true;
    void ask(`Explain ${initialRepo}: what it does, how it is organised and where a newcomer should start.`);
    // ask() is stable enough for a one-time kick-off.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRepo]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, pending]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void ask(draft);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void ask(draft);
    }
  };

  return (
    <div className={styles.shell}>
      <div className={styles.log} ref={logRef} aria-live="polite" aria-busy={pending || undefined}>
        {turns.length === 0 && !pending ? (
          <div className={styles.welcome}>
            <span className={styles.welcomeMark} aria-hidden="true">
              <LogoMark size={22} />
            </span>
            <p className={styles.welcomeTitle}>Ask about any repository or program</p>
            <p className={styles.welcomeText}>
              Name a repository (owner/repo or a GitHub link) and the assistant reads its README, layout and contributing
              guide. Ask about programs and it uses today&rsquo;s dates from Orion.
            </p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map(suggestion => (
                <button key={suggestion} type="button" className={styles.suggestion} onClick={() => void ask(suggestion)}>
                  <IconSparkles size={13} aria-hidden="true" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className={styles.turns}>
            {turns.map((turn, index) => (
              <li key={index} className={turn.role === 'user' ? styles.userTurn : styles.modelTurn}>
                <span className="visually-hidden">{turn.role === 'user' ? 'You said:' : 'Assistant:'}</span>
                {turn.role === 'user' ? <p className={styles.userText}>{turn.text}</p> : <Markdown text={turn.text} />}
              </li>
            ))}
            {pending && (
              <li className={styles.modelTurn}>
                <span className={styles.thinking}>
                  <span aria-hidden="true" />
                  Reading the sources…
                </span>
              </li>
            )}
          </ol>
        )}
      </div>

      {error && (
        <Notice tone="warning" className={styles.error}>
          {error}
        </Notice>
      )}

      <form className={styles.composer} onSubmit={onSubmit}>
        <label htmlFor="assistant-input" className="visually-hidden">
          Your question
        </label>
        <textarea
          id="assistant-input"
          className={styles.input}
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about a repository, an issue or a program…"
          rows={2}
          maxLength={2000}
        />
        <div className={styles.composerActions}>
          {turns.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                setTurns([]);
                setError(null);
              }}
              disabled={pending}
            >
              <IconRefreshCw size={13} />
              New chat
            </Button>
          )}
          <Button type="submit" variant="primary" size="sm" disabled={pending || !draft.trim()} loading={pending}>
            Ask
            <IconArrowRight size={13} />
          </Button>
        </div>
      </form>
      <p className={styles.disclaimer}>Answers come from a language model reading public sources. Check important details before you rely on them.</p>
    </div>
  );
}
