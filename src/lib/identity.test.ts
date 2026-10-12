import type { User, UserIdentity } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { avatarOf, githubLoginOf, isGitHubUsername, normalizeGitHubInput, profileSeed } from './identity';

function identity(provider: string, data: Record<string, unknown>): UserIdentity {
  return {
    id: String(data.provider_id ?? data.sub ?? '1'),
    identity_id: `${provider}-identity`,
    user_id: 'user-1',
    provider,
    identity_data: data,
    created_at: '2026-01-01T00:00:00Z',
    last_sign_in_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function user(overrides: Partial<User>): User {
  return {
    id: 'user-1',
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {},
    ...overrides,
  } as User;
}

const github = user({
  app_metadata: { provider: 'github', providers: ['github'] },
  user_metadata: { user_name: 'octocat', full_name: 'The Octocat', avatar_url: 'https://avatars.githubusercontent.com/u/583231', provider_id: '583231' },
  identities: [identity('github', { user_name: 'octocat', provider_id: '583231' })],
});

const google = user({
  email: 'ada@example.com',
  app_metadata: { provider: 'google', providers: ['google'] },
  user_metadata: {
    full_name: 'Ada Lovelace',
    name: 'Ada Lovelace',
    picture: 'https://lh3.googleusercontent.com/a/ada',
    provider_id: '110169484474386276334',
  },
  identities: [identity('google', { sub: '110169484474386276334' })],
});

describe('githubLoginOf', () => {
  it('reads the login of a GitHub sign-in', () => {
    expect(githubLoginOf(github)).toBe('octocat');
  });

  it('is null for Google-only accounts', () => {
    expect(githubLoginOf(google)).toBeNull();
    expect(githubLoginOf(null)).toBeNull();
  });

  it('finds GitHub when it is one of several linked identities', () => {
    const linked = user({ ...google, identities: [...google.identities!, identity('github', { user_name: 'ada-dev' })] });
    expect(githubLoginOf(linked)).toBe('ada-dev');
  });

  it('falls back to metadata for sessions stored without identities', () => {
    const stored = user({ ...github, identities: undefined });
    expect(githubLoginOf(stored)).toBe('octocat');
  });

  it('ignores a user_name written by a provider other than GitHub', () => {
    const odd = user({ ...google, user_metadata: { ...google.user_metadata, user_name: 'not-github' } });
    expect(githubLoginOf(odd)).toBeNull();
  });
});

describe('profileSeed', () => {
  it('fills GitHub columns for GitHub sign-ins', () => {
    expect(profileSeed(github)).toEqual({
      id: 'user-1',
      username: 'octocat',
      github_username: 'octocat',
      full_name: 'The Octocat',
      avatar_url: 'https://avatars.githubusercontent.com/u/583231',
      github_id: '583231',
    });
  });

  it('never stores a Google id as a GitHub id', () => {
    expect(profileSeed(google)).toEqual({
      id: 'user-1',
      username: null,
      github_username: null,
      full_name: 'Ada Lovelace',
      avatar_url: 'https://lh3.googleusercontent.com/a/ada',
      github_id: null,
    });
  });

  it('uses the Google photo when there is no avatar_url', () => {
    expect(avatarOf(google)).toBe('https://lh3.googleusercontent.com/a/ada');
  });
});

describe('GitHub usernames', () => {
  it.each(['octocat', 'a', 'a-b', 'Kunal-Siyag2', 'x'.repeat(39)])('accepts %s', name => {
    expect(isGitHubUsername(name)).toBe(true);
  });

  it.each(['', '-octocat', 'octocat-', 'octo--cat', 'octo_cat', 'octo cat', 'x'.repeat(40)])('rejects "%s"', name => {
    expect(isGitHubUsername(name)).toBe(false);
  });

  it.each([
    ['@octocat', 'octocat'],
    ['  octocat ', 'octocat'],
    ['https://github.com/octocat', 'octocat'],
    ['https://www.github.com/octocat/', 'octocat'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeGitHubInput(input)).toBe(expected);
  });
});
