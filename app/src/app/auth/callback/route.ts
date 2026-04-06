import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Auth callback route — exchanges OAuth PKCE code for session.
 * Supabase PKCE flow redirects here with ?code=xxx after Google login.
 * Uses createServerClient to read code-verifier cookie and write session
 * cookies back into the response so the browser receives the session.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    // Create redirect response first so we can forward session cookies into it
    const response = NextResponse.redirect(`${origin}${next}`);
    const cookieStore = await cookies();

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        // Read cookies from the incoming request (includes PKCE code-verifier)
        getAll() {
          return cookieStore.getAll();
        },
        // Write session cookies directly onto the redirect response
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }

    console.error('[Auth Callback] Code exchange failed:', error.message);
  }

  // No code or exchange failed — redirect to login with error indicator
  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
}
