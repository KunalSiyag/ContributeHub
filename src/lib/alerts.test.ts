import { describe, expect, it } from 'vitest';
import { digestEmail } from './alert-email';
import { sameSecret, unsubscribeToken, unsubscribeUrl, verifyUnsubscribe } from './alert-digest.server';
import {
  alertSearchParams,
  alertSearchQuery,
  defaultAlertName,
  describeAlert,
  discoverHrefFor,
  readAlertInput,
  readAlertSearchParams,
  type AlertInput,
} from './alerts';
import { parseArticles } from './articles';

const input = (patch: Partial<AlertInput> = {}): AlertInput => ({
  name: '',
  preset: 'good-first',
  language: 'Rust',
  labels: [],
  repos: [],
  keywords: '',
  minStars: '',
  ...patch,
});

describe('alert form', () => {
  it('cleans what people type', () => {
    const { value, problems } = readAlertInput(
      input({ labels: [' bug ', 'bug', 'help wanted'], repos: ['https://github.com/rust-lang/rust/', 'tokio-rs/tokio'], keywords: ' parser\n errors ', minStars: '50' })
    );
    expect(problems).toEqual({});
    expect(value).toEqual({
      name: 'Good first issues in Rust about “parser errors”',
      preset: 'good-first',
      language: 'Rust',
      labels: ['bug', 'help wanted'],
      repos: ['rust-lang/rust', 'tokio-rs/tokio'],
      keywords: 'parser errors',
      minStars: 50,
    });
  });

  it('explains each problem by field', () => {
    expect(readAlertInput(input({ repos: ['not a repo'] })).problems).toEqual({ repos: 'Write repositories as owner/name.' });
    expect(readAlertInput(input({ labels: ['a', 'b', 'c', 'd', 'e', 'f'] })).problems.labels).toBe('Keep to 5 labels.');
    expect(readAlertInput(input({ labels: ['say "hi"'] })).problems.labels).toMatch(/quotes/);
    expect(readAlertInput(input({ minStars: '2.5' })).problems.minStars).toBe('Use a whole number of stars.');
    expect(readAlertInput(input({ minStars: '-1' })).problems.minStars).toBe('Use a whole number of stars.');
    expect(readAlertInput(input({ name: 'x'.repeat(81) })).problems.name).toMatch(/under 80/);
    const broad = readAlertInput(input({ preset: 'all', language: '' }));
    expect(broad.value).toBeNull();
    expect(broad.problems.query).toMatch(/every new issue on GitHub/);
    expect(readAlertInput(input({ preset: 'all', language: '', repos: ['vuejs/core'] })).problems).toEqual({});
  });

  it('names alerts that have no name', () => {
    expect(defaultAlertName({ preset: 'help-wanted', language: null, labels: [], repos: ['vuejs/core'], keywords: null, minStars: 0 })).toBe('Help wanted in vuejs/core');
    expect(defaultAlertName({ preset: 'docs', language: null, labels: [], repos: [], keywords: null, minStars: 0 })).toBe('Documentation');
  });
});

describe('alert searches', () => {
  const query = { preset: 'good-first' as const, language: 'Rust', labels: ['bug'], repos: ['rust-lang/rust'], keywords: 'parser', minStars: 100 };

  it('builds the GitHub search, counting from when the alert was last seen', () => {
    expect(alertSearchQuery(query, '2026-10-12T04:15:03.611Z')).toBe(
      'is:issue is:open archived:false label:"good first issue" no:assignee label:bug language:Rust stars:>=100 parser repo:rust-lang/rust created:>2026-10-12T04:15:03Z'
    );
    expect(alertSearchQuery({ ...query, repos: [], keywords: null, labels: [], minStars: 0 })).toBe(
      'is:issue is:open archived:false label:"good first issue" no:assignee language:Rust'
    );
  });

  it('describes alerts as chips', () => {
    expect(describeAlert(query)).toEqual(['Good first issues', 'Rust', 'label: bug', 'rust-lang/rust', '“parser”', '100+ stars']);
    expect(describeAlert({ ...query, repos: ['a/b', 'c/d', 'e/f'] })).toContain('3 repositories');
  });

  it('round-trips through feed URLs and refuses empty ones', () => {
    const params = alertSearchParams(query);
    expect(params).toBe('preset=good-first&language=Rust&labels=bug&repos=rust-lang%2Frust&q=parser&stars=100');
    expect(readAlertSearchParams(new URLSearchParams(params))).toEqual(query);
    expect(readAlertSearchParams(new URLSearchParams('preset=all'))).toBeNull();
    expect(readAlertSearchParams(new URLSearchParams('preset=all&repos=bad'))).toBeNull();
  });

  it('opens the same search in Discover', () => {
    expect(discoverHrefFor(query)).toBe('/discover?language=Rust&q=parser');
    expect(discoverHrefFor({ ...query, preset: 'docs', language: null, keywords: null })).toBe('/discover?preset=docs');
  });
});

describe('alert emails', () => {
  const section = {
    name: 'Rust <bugs>',
    total: 3,
    issues: [{ title: 'Fix <script>alert(1)</script> & co', repository: 'rust-lang/rust', number: 7, url: 'https://github.com/rust-lang/rust/issues/7' }],
    unsubscribeUrl: 'https://orion.test/api/alerts/unsubscribe?alert=a&token=t',
  };

  it('escapes everything in the HTML and keeps a plain-text copy', () => {
    const email = digestEmail({ site: 'https://orion.test', sections: [section] });
    expect(email.subject).toBe('3 new issues for “Rust <bugs>”');
    expect(email.html).toContain('Fix &lt;script&gt;alert(1)&lt;/script&gt; &amp; co');
    expect(email.html).toContain('Rust &lt;bugs&gt;');
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('…and 2 more');
    expect(email.text).toContain('- rust-lang/rust#7 Fix <script>alert(1)</script> & co\n  https://github.com/rust-lang/rust/issues/7');
    expect(email.text).toContain('Stop emails for this alert: https://orion.test/api/alerts/unsubscribe?alert=a&token=t');
    expect(email.text.endsWith('Manage your alerts: https://orion.test/alerts')).toBe(true);
  });

  it('sums several alerts in the subject', () => {
    const email = digestEmail({ site: 'https://orion.test', sections: [section, { ...section, name: 'Docs', total: 1 }] });
    expect(email.subject).toBe('4 new issues across your Orion alerts');
  });

  it('signs unsubscribe links per alert and per member', () => {
    const secret = 'cron-secret';
    const token = unsubscribeToken('alert', 'abc', secret);
    expect(token).toMatch(/^[0-9a-f]{40}$/);
    expect(verifyUnsubscribe('alert', 'abc', token, secret)).toBe(true);
    expect(verifyUnsubscribe('member', 'abc', token, secret)).toBe(false);
    expect(verifyUnsubscribe('alert', 'abd', token, secret)).toBe(false);
    expect(verifyUnsubscribe('alert', 'abc', token.slice(1), secret)).toBe(false);
    expect(verifyUnsubscribe('alert', 'abc', token, 'other')).toBe(false);
    expect(unsubscribeUrl('alert', 'a1', secret, 'https://orion.test')).toBe(
      `https://orion.test/alerts/unsubscribe?alert=a1&token=${unsubscribeToken('alert', 'a1', secret)}`
    );
    expect(unsubscribeUrl('member', 'u1', secret, 'https://orion.test', 'one-click')).toBe(
      `https://orion.test/api/alerts/unsubscribe?member=u1&token=${unsubscribeToken('member', 'u1', secret)}`
    );
    expect(sameSecret('cron-secret', secret)).toBe(true);
    expect(sameSecret('cron-secreT', secret)).toBe(false);
    expect(sameSecret(null, secret)).toBe(false);
  });
});

describe('community articles', () => {
  it('keeps DEV links only', () => {
    expect(
      parseArticles([
        { title: ' Ship it ', url: 'https://dev.to/a/ship-it', user: { name: 'Ada' }, reading_time_minutes: 4, published_at: '2026-10-10T00:00:00Z', positive_reactions_count: 12, comments_count: 3 },
        { title: 'Elsewhere', url: 'https://evil.example/post', user: { name: 'Eve' } },
        { title: '', url: 'https://dev.to/b' },
      ])
    ).toEqual([{ title: 'Ship it', url: 'https://dev.to/a/ship-it', author: 'Ada', minutes: 4, published: '2026-10-10T00:00:00Z', reactions: 12, comments: 3 }]);
    expect(parseArticles({ error: 'nope' })).toEqual([]);
  });
});
