/**
 * Auth callback handler — processes email confirmations, OAuth redirects,
 * and password recovery tokens.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect') || '/dashboard';
  const type = searchParams.get('type');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Password recovery — redirect to settings or profile
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/settings`);
      }
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  // Auth error — redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
}
