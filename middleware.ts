import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Skip auth middleware if Supabase is not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  // Dynamically import to avoid errors when Supabase env vars are missing
  const { updateSession } = await import('@/lib/supabase/middleware');
  return updateSession(request);
}

export const config = {
  matcher: [
    // Match all paths except static files and API routes that don't need auth
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|og/|photos/|icons/|scene|.*\\.splinecode$|api/health).*)',
  ],
};
