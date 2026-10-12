'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { Database, DiscussionCategory } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { BODY_LIMIT, CATEGORIES, readRelated, TITLE_LIMITS } from '@/lib/community';
import { useSignIn } from '@/components/auth/SignIn';
import Markdown from '@/components/Markdown';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Tabs';
import { Notice, Panel } from '@/components/ui/primitives';
import styles from '../community.module.css';

export default function NewDiscussionForm({ initialCategory }: { initialCategory: DiscussionCategory }) {
  const { user, loading } = useAuth();
  const { openSignIn } = useSignIn();
  const router = useRouter();
  const [category, setCategory] = useState<DiscussionCategory>(initialCategory);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [related, setRelated] = useState('');
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (!loading && !user) {
    return (
      <Notice
        action={
          <Button size="sm" variant="primary" onClick={() => openSignIn('/community/new')}>
            Sign in
          </Button>
        }
      >
        Sign in to start a discussion. Reading needs no account.
      </Notice>
    );
  }

  const titleOk = title.trim().length >= TITLE_LIMITS.min;
  const relatedValue = readRelated(related);
  const relatedProblem = related.trim() && !relatedValue ? 'Use owner or owner/repo, like vuejs/core.' : undefined;
  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!titleOk || !body.trim() || relatedProblem) return;
    setSending(true);
    setError(null);
    const fields: Database['public']['Tables']['discussions']['Insert'] = { category, title: title.trim(), body: body.trim() };
    const supabase = createClient();
    let { data, error: insertError } = await supabase
      .from('discussions')
      .insert({ ...fields, ...(relatedValue && { related: relatedValue }) })
      .select('id')
      .single();
    // A database without migration 09 has no `related` column: post without it.
    if (insertError?.code === 'PGRST204' && relatedValue) {
      ({ data, error: insertError } = await supabase.from('discussions').insert(fields).select('id').single());
    }
    setSending(false);
    if (insertError || !data) {
      setError(insertError?.message.includes('Too many posts') ? insertError.message : 'Your discussion could not be posted. Try again.');
      return;
    }
    router.push(`/community/${data.id}`);
    router.refresh();
  };

  return (
    <Panel className={styles.form}>
      <form onSubmit={onSubmit} className={styles.formBody}>
        <Field label="Category">
          {id => (
            <Select
              id={id}
              value={category}
              onChange={event => setCategory(event.target.value as DiscussionCategory)}
              options={CATEGORIES.map(c => ({ value: c.value, label: c.label }))}
            />
          )}
        </Field>
        <Field label="Title" hint={`${TITLE_LIMITS.min}–${TITLE_LIMITS.max} characters, phrased like a question if you have one.`}>
          {(id, describedBy) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              value={title}
              onChange={event => setTitle(event.target.value)}
              maxLength={TITLE_LIMITS.max}
              required
              placeholder="How do I pick a GSoC organization that fits my skills?"
            />
          )}
        </Field>
        <Field label="Repository or organization (optional)" hint="owner/repo or an organization, if the discussion is about one." error={relatedProblem}>
          {(id, describedBy) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              value={related}
              onChange={event => setRelated(event.target.value)}
              invalid={Boolean(relatedProblem)}
              spellCheck={false}
              autoComplete="off"
              placeholder="vuejs/core"
            />
          )}
        </Field>
        <div className={styles.editorHead}>
          <span className={styles.editorLabel}>Details</span>
          <Segmented
            label="Editor mode"
            options={[
              { value: 'write', label: 'Write' },
              { value: 'preview', label: 'Preview' },
            ]}
            value={mode}
            onChange={setMode}
          />
        </div>
        {mode === 'write' ? (
          <Textarea
            aria-label="Details (Markdown supported)"
            value={body}
            onChange={event => setBody(event.target.value)}
            maxLength={BODY_LIMIT}
            rows={10}
            required
            placeholder="What are you working on, what did you try, and where are you stuck? Markdown works: **bold**, `code`, lists, links, and images from GitHub or Imgur: ![screenshot](https://…)."
          />
        ) : (
          <div className={styles.preview}>{body.trim() ? <Markdown text={body} images /> : <p className={styles.blurb}>Nothing to preview yet.</p>}</div>
        )}
        {error && <Notice tone="warning">{error}</Notice>}
        <div className={styles.formActions}>
          <span className={styles.counter}>
            {body.length.toLocaleString('en-US')} / {BODY_LIMIT.toLocaleString('en-US')}
          </span>
          <Button type="submit" variant="primary" loading={sending} disabled={!titleOk || !body.trim() || sending || Boolean(relatedProblem)}>
            Post discussion
          </Button>
        </div>
      </form>
    </Panel>
  );
}
