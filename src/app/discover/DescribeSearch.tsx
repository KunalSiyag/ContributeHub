'use client';

import { useRef, useState } from 'react';
import type { AskResult } from '@/lib/ask-search';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { IconSparkles } from '@/components/icons';
import styles from './page.module.css';

/** "Describe what you want": a sentence becomes Discover's filters (AI, when configured). */
export default function DescribeSearch({ onApply }: { onApply: (result: AskResult) => void }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim() || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/discover/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      });
      const data = (await response.json()) as { available?: boolean; result?: AskResult; error?: string };
      if (data.result) {
        onApply(data.result);
        setMessage(data.result.explanation || 'Filters updated.');
      } else {
        setMessage(data.error ?? (data.available === false ? 'Plain-language search isn’t available right now.' : 'Couldn’t search for that.'));
      }
    } catch {
      setMessage('Couldn’t reach Orion. Check your connection and try again.');
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        className={styles.describeToggle}
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      >
        <IconSparkles size={13} />
        Describe what you want instead
      </button>
    );
  }

  return (
    <form className={styles.describe} onSubmit={submit} role="search" aria-label="Describe the issues you want">
      <label htmlFor="discover-describe" className="visually-hidden">
        Describe the issues you want
      </label>
      <Input
        ref={inputRef}
        id="discover-describe"
        value={question}
        maxLength={300}
        placeholder="e.g. beginner Python issues about tests in projects with 1,000+ stars"
        onChange={event => setQuestion(event.target.value)}
        wrapperClassName={styles.describeField}
      />
      <Button type="submit" size="md" variant="secondary" loading={busy} disabled={busy || !question.trim()}>
        {busy ? 'Searching…' : 'Search'}
      </Button>
      <p className={styles.describeStatus} role="status" aria-live="polite">
        {message}
      </p>
    </form>
  );
}
