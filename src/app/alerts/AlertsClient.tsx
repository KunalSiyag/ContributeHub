'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import {
  ALERT_FIELD_LIMITS,
  ALERT_LIMIT,
  ALERT_PRESETS,
  alertSearchParams,
  alertSearchQuery,
  defaultAlertName,
  describeAlert,
  discoverHrefFor,
  queryOf,
  readAlertInput,
  type AlertProblems,
  type AlertQuery,
} from '@/lib/alerts';
import type { AlertsState, CheckedAlert } from '@/lib/alerts.server';
import { POPULAR_LANGUAGES } from '@/lib/matching';
import { createClient } from '@/lib/supabase/client';
import { useAlerts } from '@/contexts/AlertsContext';
import { useSignIn } from '@/components/auth/SignIn';
import { enterRow, leaveRow } from '@/components/fx/rowMotion';
import RelativeTime from '@/components/RelativeTime';
import { Button, ButtonAnchor, buttonClass } from '@/components/ui/Button';
import { Checkbox, ChipInput, Field, Input, Select } from '@/components/ui/Field';
import { EmptyState, Notice, Panel, Tag } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { IconArrowUpRight, IconBell, IconCheck, IconPencil, IconPlus, IconRss, IconTrash } from '@/components/icons';
import styles from './alerts.module.css';

export interface AlertPrefill {
  preset?: string;
  language?: string;
  q?: string;
  repos?: string;
}

interface Props {
  initialState: AlertsState;
  initialAlerts: CheckedAlert[];
  emailAvailable: boolean;
  prefill: AlertPrefill | null;
}

interface Draft {
  name: string;
  preset: string;
  language: string;
  labels: string[];
  repos: string[];
  keywords: string;
  minStars: string;
  email: boolean;
}

const EMPTY: Draft = { name: '', preset: 'good-first', language: '', labels: [], repos: [], keywords: '', minStars: '', email: false };

function draftOf(alert: CheckedAlert): Draft {
  return {
    name: alert.name,
    preset: alert.preset,
    language: alert.language ?? '',
    labels: alert.labels,
    repos: alert.repos,
    keywords: alert.keywords ?? '',
    minStars: alert.min_stars ? String(alert.min_stars) : '',
    email: alert.email_digest,
  };
}

const githubSearchUrl = (query: AlertQuery, since: string) =>
  `https://github.com/search?type=issues&s=created&o=desc&q=${encodeURIComponent(alertSearchQuery(query, since))}`;

const repoEntry = (entry: string) => entry.replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\/+$/, '');

export default function AlertsClient({ initialState, initialAlerts, emailAvailable, prefill }: Props) {
  if (initialState === 'signed-out') return <SignedOut />;
  if (initialState !== 'ready') {
    return (
      <EmptyState icon={<IconBell size={16} />} title={initialState === 'unavailable' ? 'Alerts are unavailable right now' : 'Alerts are being set up'}>
        {initialState === 'unavailable' ? 'Try again in a moment.' : 'They open as soon as the database is ready.'}
      </EmptyState>
    );
  }
  return <AlertsBoard initialAlerts={initialAlerts} emailAvailable={emailAvailable} prefill={prefill} />;
}

function SignedOut() {
  const { openSignIn } = useSignIn();
  return (
    <EmptyState
      icon={<IconBell size={16} />}
      title="Sign in to keep alerts"
      action={
        <Button variant="primary" onClick={() => openSignIn('/alerts')}>
          Sign in
        </Button>
      }
    >
      Save a search and Orion tells you when new issues match it: here, in your browser, by RSS or by email. Without an account, any search in Discover can
      still be followed as RSS.
    </EmptyState>
  );
}

function AlertsBoard({ initialAlerts, emailAvailable, prefill }: Omit<Props, 'initialState'>) {
  const { refresh, notifications, setNotifications } = useAlerts();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [editing, setEditing] = useState<string | null>(prefill || initialAlerts.length === 0 ? 'new' : null);
  const [draft, setDraft] = useState<Draft>(
    prefill
      ? { ...EMPTY, preset: prefill.preset ?? EMPTY.preset, language: prefill.language ?? '', keywords: prefill.q ?? '', repos: prefill.repos ? prefill.repos.split(',') : [] }
      : EMPTY
  );
  const [problems, setProblems] = useState<AlertProblems>({});
  const [saving, setSaving] = useState(false);
  const added = useRef(new Set<string>());
  const rows = useRef(new Map<string, HTMLLIElement>());
  const formRef = useRef<HTMLFormElement>(null);
  // Only the newest check may replace the list: an older one can finish later with rows that were since deleted.
  const latestSync = useRef(0);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(current => ({ ...current, [key]: value }));
  const preview = readAlertInput({ ...draft, name: '' }).value;

  async function sync() {
    const id = ++latestSync.current;
    const fresh = await refresh();
    if (id === latestSync.current && fresh?.state === 'ready') setAlerts(fresh.alerts);
  }

  function startNew() {
    setDraft(EMPTY);
    setProblems({});
    setEditing('new');
  }

  function startEdit(alert: CheckedAlert) {
    setDraft(draftOf(alert));
    setProblems({});
    setEditing(alert.id);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      formRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
    });
  }

  function stopEditing() {
    setEditing(null);
    setDraft(EMPTY);
    setProblems({});
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const { value, problems: found } = readAlertInput(draft);
    setProblems(found);
    if (!value) return;
    setSaving(true);
    const fields = {
      name: value.name,
      preset: value.preset,
      language: value.language,
      labels: value.labels,
      repos: value.repos,
      keywords: value.keywords,
      min_stars: value.minStars,
      email_digest: emailAvailable && draft.email,
    };
    const supabase = createClient();
    if (editing === 'new') {
      const { data, error } = await supabase.from('alert_rules').insert(fields).select().single();
      setSaving(false);
      if (error || !data) {
        setProblems({ query: error?.message.includes('up to 10 alerts') ? 'You can keep up to 10 alerts. Delete one to add another.' : 'The alert couldn’t be saved. Try again.' });
        return;
      }
      added.current.add(data.id);
      setAlerts(list => [...list, { ...data, newCount: 0, latest: [] }]);
      toast('Alert created. New matches show here and in the sidebar.', { tone: 'success' });
    } else if (editing) {
      const before = alerts.find(alert => alert.id === editing);
      const changed = before && JSON.stringify(queryOf(before)) !== JSON.stringify(queryOf({ ...fields, preset: value.preset }));
      const { data, error } = await supabase
        .from('alert_rules')
        .update({ ...fields, ...(changed && { last_seen_at: new Date().toISOString() }) })
        .eq('id', editing)
        .select()
        .single();
      setSaving(false);
      if (error || !data) {
        setProblems({ query: 'The alert couldn’t be saved. Try again.' });
        return;
      }
      setAlerts(list => list.map(alert => (alert.id === editing ? { ...alert, ...data, ...(changed && { newCount: 0, latest: [] }) } : alert)));
      toast('Alert saved.', { tone: 'success' });
    }
    stopEditing();
    void sync();
  }

  async function markSeen(alert: CheckedAlert) {
    const seen = new Date().toISOString();
    setAlerts(list => list.map(item => (item.id === alert.id ? { ...item, last_seen_at: seen, newCount: 0, latest: [] } : item)));
    const { error } = await createClient().from('alert_rules').update({ last_seen_at: seen }).eq('id', alert.id);
    if (error) toast('Couldn’t mark it as seen. Try again.', { tone: 'error' });
    void sync();
  }

  async function setEmail(alert: CheckedAlert, on: boolean) {
    setAlerts(list => list.map(item => (item.id === alert.id ? { ...item, email_digest: on } : item)));
    const { error } = await createClient().from('alert_rules').update({ email_digest: on }).eq('id', alert.id);
    if (error) {
      setAlerts(list => list.map(item => (item.id === alert.id ? { ...item, email_digest: !on } : item)));
      toast('Couldn’t change the email setting. Try again.', { tone: 'error' });
    }
  }

  async function restore(alert: CheckedAlert) {
    const { data, error } = await createClient()
      .from('alert_rules')
      .insert({
        name: alert.name,
        preset: alert.preset,
        language: alert.language,
        labels: alert.labels,
        repos: alert.repos,
        keywords: alert.keywords,
        min_stars: alert.min_stars,
        email_digest: alert.email_digest,
        last_seen_at: alert.last_seen_at,
      })
      .select()
      .single();
    if (error || !data) {
      toast('Couldn’t bring the alert back.', { tone: 'error' });
      return;
    }
    added.current.add(data.id);
    setAlerts(list => [...list, { ...data, newCount: alert.newCount, latest: alert.latest }]);
    void sync();
  }

  async function remove(alert: CheckedAlert) {
    const { error } = await createClient().from('alert_rules').delete().eq('id', alert.id);
    if (error) {
      toast('Couldn’t delete the alert. Try again.', { tone: 'error' });
      return;
    }
    if (editing === alert.id) stopEditing();
    leaveRow(rows.current.get(alert.id) ?? null, () => setAlerts(list => list.filter(item => item.id !== alert.id)));
    toast(`Deleted “${alert.name}”.`, { action: { label: 'Undo', onClick: () => void restore(alert) } });
    void sync();
  }

  async function toggleNotifications(on: boolean) {
    const result = await setNotifications(on);
    if (on && result === 'blocked') toast('Notifications are blocked for this site. Allow them in your browser’s site settings.', { tone: 'error' });
    else if (on && result === 'on') toast('Orion will notify you about new matches while it’s open in a tab.', { tone: 'success' });
  }

  function rowRef(id: string) {
    return (el: HTMLLIElement | null) => {
      if (!el) {
        rows.current.delete(id);
        return;
      }
      rows.current.set(id, el);
      if (added.current.delete(id)) enterRow(el);
    };
  }

  const full = alerts.length >= ALERT_LIMIT;

  return (
    <div className={styles.board}>
      <div className={styles.toolbar}>
        <p className={styles.summary}>
          {alerts.length} of {ALERT_LIMIT} alerts
        </p>
        {notifications === 'unsupported' ? (
          <span className={styles.toolbarNote}>This browser can’t show notifications.</span>
        ) : (
          <Checkbox
            label={notifications === 'blocked' ? 'Browser notifications (blocked in site settings)' : 'Notify me in this browser'}
            checked={notifications === 'on'}
            disabled={notifications === 'blocked'}
            onChange={event => void toggleNotifications(event.target.checked)}
          />
        )}
        {editing === null && (
          <Button variant="secondary" size="sm" onClick={startNew} disabled={full} title={full ? 'Delete an alert to add another' : undefined}>
            <IconPlus size={14} />
            New alert
          </Button>
        )}
      </div>

      {editing !== null && (
        <Panel as="section" className={styles.formPanel} aria-labelledby="alert-form-title">
          <form ref={formRef} onSubmit={save} noValidate className={styles.form}>
            <h2 id="alert-form-title" className={styles.formTitle}>
              {editing === 'new' ? 'New alert' : 'Edit alert'}
            </h2>
            {editing === 'new' && alerts.length === 0 && (
              <p className={styles.formIntro}>Choose what to watch. Orion counts new matching issues and shows them here and in the sidebar.</p>
            )}
            <div className={styles.grid}>
              <Field label="Issues">
                {id => (
                  <Select id={id} options={ALERT_PRESETS} value={draft.preset} onChange={event => set('preset', event.target.value)} />
                )}
              </Field>
              <Field label="Language" hint="Any language when empty" error={problems.language}>
                {(id, describedBy) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    list="alert-languages"
                    value={draft.language}
                    maxLength={ALERT_FIELD_LIMITS.language}
                    invalid={Boolean(problems.language)}
                    onChange={event => set('language', event.target.value)}
                  />
                )}
              </Field>
              <Field label="Labels" hint="All of them, up to 5" error={problems.labels}>
                {(id, describedBy) => (
                  <ChipInput id={id} aria-describedby={describedBy} value={draft.labels} max={ALERT_FIELD_LIMITS.labels} onChange={value => set('labels', value)} />
                )}
              </Field>
              <Field label="Repositories" hint="owner/name; any repository when empty" error={problems.repos}>
                {(id, describedBy) => (
                  <ChipInput
                    id={id}
                    aria-describedby={describedBy}
                    value={draft.repos}
                    max={ALERT_FIELD_LIMITS.repos}
                    transform={repoEntry}
                    placeholder="owner/name, then Enter"
                    onChange={value => set('repos', value)}
                  />
                )}
              </Field>
              <Field label="Keywords" hint="Words in the title or description" error={problems.keywords}>
                {(id, describedBy) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    value={draft.keywords}
                    maxLength={ALERT_FIELD_LIMITS.keywords}
                    invalid={Boolean(problems.keywords)}
                    onChange={event => set('keywords', event.target.value)}
                  />
                )}
              </Field>
              <Field label="Minimum stars" error={problems.minStars}>
                {(id, describedBy) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    placeholder="0"
                    value={draft.minStars}
                    invalid={Boolean(problems.minStars)}
                    onChange={event => set('minStars', event.target.value)}
                  />
                )}
              </Field>
              <Field label="Name" hint={preview ? `Shown as “${defaultAlertName(preview)}” when empty` : undefined} error={problems.name} className={styles.wide}>
                {(id, describedBy) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    value={draft.name}
                    maxLength={ALERT_FIELD_LIMITS.name}
                    invalid={Boolean(problems.name)}
                    onChange={event => set('name', event.target.value)}
                  />
                )}
              </Field>
            </div>
            <datalist id="alert-languages">
              {POPULAR_LANGUAGES.map(language => (
                <option key={language} value={language} />
              ))}
            </datalist>
            {emailAvailable ? (
              <Checkbox label="Email me a daily digest of new matches" checked={draft.email} onChange={event => set('email', event.target.checked)} />
            ) : (
              <p className={styles.formNote}>Email digests aren’t set up on this site yet; use RSS or browser notifications for now.</p>
            )}
            {problems.query && (
              <p className={styles.formError} role="alert">
                {problems.query}
              </p>
            )}
            <div className={styles.formActions}>
              <Button type="submit" variant="primary" loading={saving} disabled={saving}>
                {saving ? (editing === 'new' ? 'Creating…' : 'Saving…') : editing === 'new' ? 'Create alert' : 'Save alert'}
              </Button>
              {(alerts.length > 0 || editing !== 'new') && (
                <Button type="button" variant="ghost" onClick={stopEditing} disabled={saving}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Panel>
      )}

      {alerts.length > 0 && (
        <h2 id="your-alerts" className="visually-hidden">
          Your alerts
        </h2>
      )}
      {alerts.length > 0 && (
        <ul className={styles.list} aria-labelledby="your-alerts">
          {alerts.map(alert => {
            const query = queryOf(alert);
            const count = alert.newCount;
            return (
              <li key={alert.id} ref={rowRef(alert.id)} className={styles.row}>
                <div className={styles.rowHead}>
                  <h3 className={styles.name}>
                    {Boolean(count) && <span className={styles.liveDot} aria-hidden="true" />}
                    {alert.name}
                  </h3>
                  <span className={styles.count} data-state={count === null ? 'unknown' : count > 0 ? 'new' : 'none'}>
                    {count === null ? 'Not checked' : count === 0 ? 'Nothing new' : `${count.toLocaleString('en-US')} new`}
                  </span>
                </div>
                <div className={styles.chips}>
                  {describeAlert(query).map(part => (
                    <Tag key={part} tone="muted">
                      {part}
                    </Tag>
                  ))}
                  <span className={styles.since}>
                    <RelativeTime date={alert.last_seen_at} prefix="since" />
                  </span>
                </div>
                {alert.latest.length > 0 && (
                  <ul className={styles.matches} aria-label={`New issues for ${alert.name}`}>
                    {alert.latest.map(match => (
                      <li key={match.url} className={styles.match}>
                        <Link href={`/issues/${match.repository}/${match.number}`} className={styles.matchTitle}>
                          {match.title}
                        </Link>
                        <span className={styles.matchMeta}>
                          {match.repository}#{match.number} · <RelativeTime date={match.created} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {count !== null && count > alert.latest.length && (
                  <a href={githubSearchUrl(query, alert.last_seen_at)} target="_blank" rel="noopener noreferrer" className={styles.more}>
                    All {count.toLocaleString('en-US')} on GitHub
                    <IconArrowUpRight size={12} />
                  </a>
                )}
                <div className={styles.actions}>
                  {Boolean(count) && (
                    <Button variant="secondary" size="sm" onClick={() => void markSeen(alert)}>
                      <IconCheck size={14} />
                      Mark as seen
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => startEdit(alert)}>
                    <IconPencil size={14} />
                    Edit
                  </Button>
                  <ButtonAnchor variant="ghost" size="sm" href={`/feed/alerts.xml?${alertSearchParams(query)}`} title="Follow this alert in a feed reader">
                    <IconRss size={14} />
                    RSS
                  </ButtonAnchor>
                  <Link href={discoverHrefFor(query)} className={buttonClass({ variant: 'ghost', size: 'sm' })}>
                    Open in Discover
                  </Link>
                  <span className={styles.actionsSpacer} />
                  <Checkbox
                    label="Daily email"
                    checked={alert.email_digest}
                    disabled={!emailAvailable}
                    title={emailAvailable ? undefined : 'Email digests aren’t set up on this site yet'}
                    onChange={event => void setEmail(alert, event.target.checked)}
                  />
                  <Button variant="ghost" size="sm" iconOnly aria-label={`Delete “${alert.name}”`} onClick={() => void remove(alert)}>
                    <IconTrash size={14} />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {alerts.length === 0 && editing === null && (
        <EmptyState icon={<IconBell size={16} />} title="No alerts yet" action={<Button variant="primary" onClick={startNew}>New alert</Button>}>
          Alerts watch a search for you and count the new issues that match it.
        </EmptyState>
      )}

      <Notice title="Other ways to get alerts" icon={<IconRss size={15} />}>
        Every alert has an RSS feed: add it to a feed reader, a Slack or Discord RSS app, or an RSS-to-email service. For one issue a day from
        repositories you follow, use the watchlist in the <Link href="/issues?tab=repos">Tracker</Link>.
      </Notice>
    </div>
  );
}
