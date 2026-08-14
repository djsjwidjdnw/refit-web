import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { postAuthPath, safeNext } from '@/lib/auth/post-auth-path';

// ─────────────────────────────────────────────────────────────────────────────────────
// THE ROUTE EVERY SUPABASE EMAIL LINK LANDS ON.
//
// WHY IT EXISTS EVEN THOUGH NOTHING USES IT TODAY.
// Email confirmation is currently OFF on the project (mailer_autoconfirm: true), so
// supabase.auth.signUp() returns a session in the same tick and no mail is ever sent.
// That is the only reason signups work. Turning that one switch on in the Supabase
// dashboard sends every new user a link, and until this file existed that link landed on
// a 404: no session, no shop, no error anybody could see. Not a degraded signup, a
// silently total one. This route is the thing that makes that switch safe to flip.
//
// It is inert while confirmation is off. Nothing calls it, and the signup path is
// untouched.
//
// TWO LINK SHAPES, ONE ROUTE.
// Which parameters actually arrive depends on the email template, which is a dashboard
// setting nobody here controls from code, so the route handles both:
//
//   ?code=<uuid>                    Supabase's DEFAULT template. {{ .ConfirmationURL }}
//                                   points at the project's /auth/v1/verify endpoint,
//                                   which verifies server-side and then bounces the
//                                   browser here with a PKCE code to exchange.
//   ?token_hash=<hash>&type=<type>  A template rewritten to use {{ .TokenHash }}, which
//                                   is what Supabase's current docs recommend. Verified
//                                   in-place with verifyOtp.
//
// Handling only one of the two is the standard way this breaks: it works in testing,
// somebody edits an email template a year later, and every link starts failing.
//
// PKCE NOTE. createBrowserClient/createServerClient default to the PKCE flow, and the
// code verifier lives in a cookie the browser client wrote at signUp time. This handler
// reads cookies through lib/supabase/server.ts, so exchangeCodeForSession can see it.
// That is also why the exchange has to happen server-side here and not on a page.
//
// MIDDLEWARE. middleware.ts DOES run on this path (the matcher only excludes static
// assets), but updateSession only ever redirects an unauthenticated request away from
// /dashboard and /ops, so it passes this through untouched. Do not add /auth to a guard.
// ─────────────────────────────────────────────────────────────────────────────────────

// Supabase's own list, so a template using any of them resolves. Anything else is
// rejected rather than passed to verifyOtp as an unchecked string.
const OTP_TYPES: EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
];

function isOtpType(v: string | null): v is EmailOtpType {
  return v !== null && (OTP_TYPES as string[]).includes(v);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  // Behind Vercel the request origin is the internal one, so a redirect built from
  // `origin` can point somewhere the user cannot reach. x-forwarded-host is the domain
  // the browser actually asked for.
  //
  // Supabase's documented version of this hardcodes https:// and special-cases
  // NODE_ENV === 'development'. That is wrong for `next start`, which is what a local
  // production build and any self-hosted deploy runs: NODE_ENV is 'production' there, and
  // Next populates the x-forwarded-* headers itself even with no proxy in front, so the
  // hardcoded scheme sent every local redirect to https://localhost:3987 and the browser
  // could not follow it. Verified against a real `next start`.
  //
  // So the forwarded host is only believed when it actually names a DIFFERENT host from
  // the one this request arrived on, which is the only case a proxy is really rewriting
  // anything. Everything else uses the request's own origin, scheme included.
  const url = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const base =
    forwardedHost && forwardedHost !== url.host
      ? `${request.headers.get('x-forwarded-proto') ?? 'https'}://${forwardedHost}`
      : origin;

  // Every response out of this route carries Set-Cookie for the session, or is a step on
  // the way to one, so none of it may be stored by a CDN or a shared proxy.
  // @supabase/ssr only started passing cache headers to setAll automatically in 0.10.0
  // and this project is on 0.5.2, so per Supabase's own advanced guide it has to be set
  // by hand on any route that handles authentication.
  const send = (url: URL) => {
    const res = NextResponse.redirect(url);
    res.headers.set('Cache-Control', 'private, no-store');
    return res;
  };

  const fail = (reason: string, description?: string | null) => {
    const url = new URL('/auth/auth-code-error', base);
    url.searchParams.set('reason', reason);
    if (description) url.searchParams.set('description', description);
    return send(url);
  };

  // Supabase reports a dead link by redirecting HERE with error params rather than by
  // failing the exchange, so this has to be checked before anything else. The common one
  // is ?error=access_denied&error_code=otp_expired.
  const errorCode = searchParams.get('error_code') ?? searchParams.get('error');
  if (errorCode) return fail(errorCode, searchParams.get('error_description'));

  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  if (!code && !tokenHash) return fail('missing_code');
  if (tokenHash && !isOtpType(type)) return fail('bad_type');

  const supabase = await createClient();

  // Both branches set the session cookies through the cookie store in
  // lib/supabase/server.ts. In a Route Handler that store is writable, so the Set-Cookie
  // headers ride out on the redirect below. (The try/catch in that file is there for
  // Server Components, where it is not.)
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash! });

  if (error) return fail(error.code ?? 'exchange_failed', error.message);

  // Same destination logic as the password form at /login, deliberately shared so the two
  // doors cannot drift. `next` is sanitised against open redirects; see safeNext.
  const next = safeNext(searchParams.get('next'));
  const dest = next ?? (await postAuthPath(supabase));

  return send(new URL(dest, base));
}
