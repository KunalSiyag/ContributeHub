/** "owner/repo", "https://github.com/owner/repo/issues/3" or "github.com/owner/repo.git" → owner/repo. */
export function parseRepoInput(value: string): { owner: string; repo: string } | null {
  const trimmed = value.trim().replace(/^https?:\/\//i, '').replace(/^(www\.)?github\.com\//i, '');
  const match = /^([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?(?:[/?#].*)?$/.exec(trimmed);
  if (!match || match[2] === '.' || match[2] === '..') return null;
  return { owner: match[1], repo: match[2] };
}
