import { NextResponse, type NextRequest } from 'next/server';
import { unsubscribe, type UnsubscribeScope } from '@/lib/alert-digest.server';

/**
 * POST /api/alerts/unsubscribe?alert=<id>&token=… (or ?member=<id>) — stops
 * alert emails. Mail apps call it for one-click unsubscribe (RFC 8058); the
 * confirmation page posts here too. The token is signed per alert or member.
 */
export async function POST(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const scope: UnsubscribeScope = params.has('member') ? 'member' : 'alert';
  const id = params.get(scope) ?? '';
  const token = params.get('token') ?? '';
  const done = id && token ? await unsubscribe(scope, id, token) : false;

  const form = await request.formData().catch(() => null);
  if (form?.get('from') === 'page') {
    return NextResponse.redirect(new URL(`/alerts/unsubscribe?${done ? 'done=1' : 'failed=1'}`, request.url), 303);
  }
  return new Response(done ? 'Unsubscribed.' : 'This link is not valid.', { status: done ? 200 : 400 });
}
