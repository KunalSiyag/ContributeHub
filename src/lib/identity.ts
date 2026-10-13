import type { User } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

const GITHUB_USERNAME = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

/** GitHub's rules: 1–39 letters, digits or single hyphens, no leading or trailing hyphen. */
export function isGitHubUsername(value: string): boolean {
  return GITHUB_USERNAME.test(value);
}

/** Accepts "octocat", "@octocat" or a profile URL. */
export function normalizeGitHubInput(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/+$/, '');
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function githubIdentity(user: User) {
  return user.identities?.find(identity => identity.provider === 'github') ?? null;
}

/**
 * The GitHub login of an account that signed in with GitHub, or null for
 * accounts that only use another provider (Google). Never guesses from
 * metadata that another provider may have written.
 */
export function githubLoginOf(user: User | null | undefined): string | null {
  if (!user) return null;
  const identity = githubIdentity(user);
  const fromIdentity = text(identity?.identity_data?.user_name) ?? text(identity?.identity_data?.preferred_username);
  if (fromIdentity) return fromIdentity;

  const providers: unknown = user.app_metadata?.providers ?? [user.app_metadata?.provider];
  const usesGitHub = Array.isArray(providers) && providers.includes('github');
  return usesGitHub ? text(user.user_metadata?.user_name) ?? text(user.user_metadata?.preferred_username) : null;
}

export function displayNameOf(user: User): string | null {
  const meta = user.user_metadata ?? {};
  return text(meta.full_name) ?? text(meta.name);
}

export function avatarOf(user: User): string | null {
  const meta = user.user_metadata ?? {};
  return text(meta.avatar_url) ?? text(meta.picture);
}

/** Profile row for an account whose signup trigger didn't create one. */
export function profileSeed(user: User): ProfileInsert {
  const login = githubLoginOf(user);
  const identity = githubIdentity(user);
  const githubId = login ? text(identity?.identity_data?.provider_id) ?? text(identity?.id) ?? text(user.user_metadata?.provider_id) : null;
  return {
    id: user.id,
    username: login,
    github_username: login,
    full_name: displayNameOf(user),
    avatar_url: avatarOf(user),
    github_id: githubId,
  };
}
