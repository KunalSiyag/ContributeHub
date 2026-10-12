import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Only same-origin relative paths are allowed as post-login destinations. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/dashboard';
  if (value.startsWith('/auth/')) return '/dashboard';
  return value;
}

/** Auth failure codes grouped into the reasons /auth/error explains in plain words. */
function reasonFor(code: string | null | undefined): string | null {
  switch (code) {
    case 'access_denied':
      return 'access_denied';
    case 'pkce_code_verifier_not_found':
    case 'bad_code_verifier':
      return 'other_browser';
    case 'flow_state_expired':
    case 'flow_state_not_found':
    case 'otp_expired':
      return 'expired';
    default:
      return null;
  }
}

function errorRedirect(origin: string, reason: string | null, detail?: string | null) {
  const url = new URL('/auth/error', origin);
  url.searchParams.set('error', reason ?? 'unknown');
  // Raw provider text is kept for the "technical details" disclosure only.
  if (!reason && detail) url.searchParams.set('detail', detail.slice(0, 300));
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));
  const providerError = searchParams.get('error');

  if (providerError) {
    const reason = reasonFor(searchParams.get('error_code')) ?? reasonFor(providerError);
    return errorRedirect(origin, reason, searchParams.get('error_description') || providerError);
  }

  if (!code) return errorRedirect(origin, 'missing_code');

  const supabase = await createClient();
  // Newer auth clients tag each PKCE flow; passing the id picks (and clears) the right verifier.
  const flowId = searchParams.get('sb_flow_id');
  const { error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);

  if (error) return errorRedirect(origin, reasonFor(error.code), error.message);

  return NextResponse.redirect(new URL(next, origin));
}
