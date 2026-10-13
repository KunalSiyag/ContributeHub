/** Absolute base URL for metadata, feeds and sitemaps (no trailing slash). */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

/** Orion's own repository. */
export const REPO_URL = 'https://github.com/kunalsiyag/ContributeHub';

/** Where people can sponsor Orion (GitHub Sponsors, Open Collective…); unset hides the option. */
export function sponsorUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SPONSOR_URL?.trim();
  return url && /^https:\/\/[^\s]+$/.test(url) ? url : null;
}
