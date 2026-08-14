import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on all routes except static assets / images and the auth callback.
    //
    // `auth/` MUST be excluded, and for a sharper reason than performance.
    // updateSession calls getUser() on every matched request. When a browser carries a
    // STALE session cookie whose session no longer exists server-side, getUser() raises
    // AuthSessionMissingError, and @supabase/auth-js responds by calling _removeSession()
    // and then deleting `sb-<ref>-auth-token-code-verifier`
    // (auth-js GoTrueClient.js:2637-2644). The setAll in lib/supabase/middleware.ts
    // writes those deletions back onto `request`, and that is the request the route
    // handler then reads. So the PKCE verifier that the confirmation link needs is gone
    // BEFORE app/auth/callback/route.ts runs, and exchangeCodeForSession fails with
    // pkce_code_verifier_not_found.
    //
    // It does NOT fire on a clean first signup: with no access token at all getUser()
    // returns the error rather than throwing, so nothing is deleted. It fires for exactly
    // the people already having a bad day. An account deleted through delete_my_account
    // and then any emailed link clicked on that same browser, a session revoked
    // server-side, or a password-recovery link opened in a browser holding a dead
    // session — which is the most likely real path, since recovery is what a stuck user
    // asks for.
    //
    // Nothing is lost by excluding it. /auth/* is not a protected path, the callback
    // builds its own Supabase client and writes its own cookies, and an unauthenticated
    // visitor is precisely who is meant to arrive there. The /dashboard and /ops gates in
    // lib/supabase/middleware.ts are untouched.
    //
    // `_vercel` MUST be excluded. Vercel Web Analytics and Speed Insights are
    // served from /_vercel/insights/script.js and /_vercel/speed-insights/script.js,
    // and those paths matched none of the exclusions below — so every analytics
    // script fetch was spinning up a Supabase server client in the edge
    // middleware first. That is Vercel's own documented cause of undercounted
    // pageviews, and it is the leading suspect for 127 ad clicks logging only 46
    // landing-page views.
    '/((?!_next/static|_next/image|_vercel|auth/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    // ALWAYS run on the operator cockpit — even for image-like paths (e.g. /ops/shops/x.png,
    // which the [id] route would otherwise match) — so the /ops web gate is never bypassed.
    '/ops/:path*',
  ],
};
