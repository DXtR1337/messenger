/**
 * Supabase middleware helper — refreshes the session on every request.
 * Called from the root middleware.ts file.
 */

import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only run auth logic on auth routes (login/signup redirect) — skip everything else
  // Dashboard, analysis, settings, profile are NOT protected (local-first app)
  const isAuthRoute = pathname.startsWith('/auth');
  if (!isAuthRoute) {
    return NextResponse.next();
  }

  // Skip auth logic when Supabase env vars are not configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next();
  }

  // Only for /auth/* routes: check if user is logged in → redirect to dashboard
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  // If logged in and trying to access auth pages, redirect to dashboard
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}
