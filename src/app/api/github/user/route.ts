import { NextResponse, type NextRequest } from 'next/server';
import { GitHubError, getUser } from '@/lib/github';
import { CACHE_HEADERS, errorResponse, jsonError } from '@/lib/api';
import { isGitHubUsername } from '@/lib/identity';

/** GET /api/github/user?username=octocat — confirms an account exists; returns its canonical login. */
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username') ?? '';
  if (!isGitHubUsername(username)) return jsonError(400, 'invalid_username', 'Provide a valid GitHub username.');

  try {
    const user = await getUser(username);
    return NextResponse.json(
      { login: user.login, name: user.name, avatarUrl: user.avatar_url },
      { headers: CACHE_HEADERS.long }
    );
  } catch (err) {
    if (err instanceof GitHubError && err.status === 404) {
      return jsonError(404, 'not_found', `No GitHub account is named ${username}.`);
    }
    return errorResponse(err);
  }
}
