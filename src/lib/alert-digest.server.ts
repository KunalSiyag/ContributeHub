import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { alertSearchQuery, queryOf } from './alerts';
import { digestEmail, type DigestSection } from './alert-email';
import { repoFullName, searchIssues } from './github';
import { getSiteUrl } from './site';
import { SUPABASE_URL, isSupabaseConfigured } from './supabase/config';

/*
 * Daily email digests for alerts with email turned on. Off until the site
 * sets RESEND_API_KEY (or another Resend-compatible API through
 * ALERTS_EMAIL_API_URL), ALERTS_FROM_EMAIL, SUPABASE_SERVICE_ROLE_KEY and
 * CRON_SECRET; Vercel Cron calls /api/cron/alert-digest once a day.
 */

/** Alerts checked per run, stalest first; GitHub allows 30 searches a minute. */
const RULES_PER_RUN = 25;
/** A first digest, or one after a long gap, looks back at most this far. */
const LOOKBACK_MS = 7 * 86_400_000;

export interface EmailConfig {
  apiKey: string;
  from: string;
  serviceKey: string;
  secret: string;
  endpoint: string;
}

export function emailConfig(): EmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERTS_FROM_EMAIL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = process.env.CRON_SECRET;
  if (!apiKey || !from || !serviceKey || !secret || !isSupabaseConfigured()) return null;
  return { apiKey, from, serviceKey, secret, endpoint: process.env.ALERTS_EMAIL_API_URL || 'https://api.resend.com/emails' };
}

export const isEmailConfigured = () => emailConfig() !== null;

export type UnsubscribeScope = 'alert' | 'member';

/** Signs an unsubscribe link, so only the person who got the email can use it. */
export function unsubscribeToken(scope: UnsubscribeScope, id: string, secret: string) {
  return createHmac('sha256', secret).update(`unsubscribe:${scope}:${id}`).digest('hex').slice(0, 40);
}

export function verifyUnsubscribe(scope: UnsubscribeScope, id: string, token: string, secret: string) {
  const expected = Buffer.from(unsubscribeToken(scope, id, secret));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Constant-time check of a bearer secret. */
export function sameSecret(given: string | null, secret: string) {
  const a = Buffer.from(given ?? '');
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Links in the email open a confirmation page, so mail scanners that follow
 * links can't unsubscribe anyone; the List-Unsubscribe header uses the
 * one-click endpoint, which mail apps POST to (RFC 8058).
 */
export function unsubscribeUrl(scope: UnsubscribeScope, id: string, secret: string, site = getSiteUrl(), target: 'page' | 'one-click' = 'page') {
  const path = target === 'page' ? '/alerts/unsubscribe' : '/api/alerts/unsubscribe';
  return `${site}${path}?${scope}=${encodeURIComponent(id)}&token=${unsubscribeToken(scope, id, secret)}`;
}

/** Bypasses row-level security: only for the digest and unsubscribe links. */
export function adminClient(config: EmailConfig) {
  return createClient<Database>(SUPABASE_URL, config.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Turns email off for one alert or for all of a member's alerts. */
export async function unsubscribe(scope: UnsubscribeScope, id: string, token: string): Promise<boolean> {
  const config = emailConfig();
  if (!config || !verifyUnsubscribe(scope, id, token, config.secret)) return false;
  const { error } = await adminClient(config)
    .from('alert_rules')
    .update({ email_digest: false })
    .eq(scope === 'alert' ? 'id' : 'user_id', id);
  return !error;
}

export interface DigestSummary {
  checked: number;
  emailed: number;
  failed: number;
}

export async function runAlertDigest(now = new Date()): Promise<DigestSummary> {
  const config = emailConfig();
  if (!config) throw new Error('Email alerts are not configured.');
  const admin = adminClient(config);
  const site = getSiteUrl();

  const { data: rules, error } = await admin
    .from('alert_rules')
    .select('*')
    .eq('email_digest', true)
    .order('last_emailed_at', { ascending: true, nullsFirst: true })
    .limit(RULES_PER_RUN);
  if (error) throw new Error(`Couldn't read alerts: ${error.message}`);

  const checked: Array<{ id: string; userId: string }> = [];
  const sections = new Map<string, DigestSection[]>();
  for (const rule of rules ?? []) {
    const from = Math.max(new Date(rule.last_emailed_at ?? rule.created_at).getTime(), now.getTime() - LOOKBACK_MS);
    try {
      const result = await searchIssues(alertSearchQuery(queryOf(rule), new Date(from).toISOString()), { sort: 'created', perPage: 10, revalidate: 0 });
      checked.push({ id: rule.id, userId: rule.user_id });
      if (result.total_count === 0) continue;
      const list = sections.get(rule.user_id) ?? [];
      list.push({
        name: rule.name,
        total: result.total_count,
        issues: result.items.map(issue => ({ title: issue.title, repository: repoFullName(issue.repository_url), number: issue.number, url: issue.html_url })),
        unsubscribeUrl: unsubscribeUrl('alert', rule.id, config.secret, site),
      });
      sections.set(rule.user_id, list);
    } catch {
      // GitHub said no (rate limit, outage): this alert waits for the next run.
    }
  }

  let emailed = 0;
  const failed = new Set<string>();
  for (const [userId, list] of sections) {
    const { data } = await admin.auth.admin.getUserById(userId);
    const to = data.user?.email;
    if (!to) continue;
    const { subject, text, html } = digestEmail({ site, sections: list });
    const everything = unsubscribeUrl('member', userId, config.secret, site, 'one-click');
    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: config.from,
          to: [to],
          subject,
          text,
          html,
          headers: { 'List-Unsubscribe': `<${everything}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) emailed++;
      else failed.add(userId);
    } catch {
      failed.add(userId);
    }
  }

  // The next digest starts where this one ended, except for members whose email didn't go out.
  const advance = checked.filter(rule => !failed.has(rule.userId)).map(rule => rule.id);
  if (advance.length) await admin.from('alert_rules').update({ last_emailed_at: now.toISOString() }).in('id', advance);

  return { checked: checked.length, emailed, failed: failed.size };
}
