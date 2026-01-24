import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors from provider
  if (error) {
    console.error('OAuth error from provider:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/auth/error?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    );
  }

  if (code) {
    const cookieStore = await cookies();
    
    // Create authenticated Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, {
                  ...options,
                  path: '/',
                  sameSite: 'lax',
                  secure: process.env.NODE_ENV === 'production',
                  httpOnly: false,
                })
              );
            } catch {
              // Ignore errors in Server Components
            }
          },
        },
      }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Failed to exchange code for session:', exchangeError.message);
      return NextResponse.redirect(
        new URL(`/auth/error?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
      );
    }

    // Redirect to the intended destination
    const redirectUrl = new URL(next, requestUrl.origin);
    return NextResponse.redirect(redirectUrl);
  }

  // No code found - redirect home
  console.error('No auth code found in callback');
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
