import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on all routes except static assets / images.
    //
    // `_vercel` MUST be excluded. Vercel Web Analytics and Speed Insights are
    // served from /_vercel/insights/script.js and /_vercel/speed-insights/script.js,
    // and those paths matched none of the exclusions below — so every analytics
    // script fetch was spinning up a Supabase server client in the edge
    // middleware first. That is Vercel's own documented cause of undercounted
    // pageviews, and it is the leading suspect for 127 ad clicks logging only 46
    // landing-page views.
    '/((?!_next/static|_next/image|_vercel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    // ALWAYS run on the operator cockpit — even for image-like paths (e.g. /ops/shops/x.png,
    // which the [id] route would otherwise match) — so the /ops web gate is never bypassed.
    '/ops/:path*',
  ],
};
