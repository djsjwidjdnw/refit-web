import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on all routes except static assets / images.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    // ALWAYS run on the operator cockpit — even for image-like paths (e.g. /ops/shops/x.png,
    // which the [id] route would otherwise match) — so the /ops web gate is never bypassed.
    '/ops/:path*',
  ],
};
