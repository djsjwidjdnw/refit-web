'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { postAuthPath } from '@/lib/auth/post-auth-path';
import { BrandMark } from '../../brand-mark';

// ─────────────────────────────────────────────────────────────────────────────────────
// THE PAGE THAT CATCHES WHAT THE SERVER ROUTE COULD NOT READ.
//
// It is the failure branch of /auth/callback, and it is also the ONLY place one entirely
// legitimate kind of link can be completed, which is why it is a client component.
//
// Supabase emits two shapes of link and they are not equivalent to a server:
//
//   PKCE            resetPasswordForEmail() from the browser stores a code verifier, so
//                   GoTrue redirects to ...?code=<uuid>&next=/reset-password. Query
//                   params, readable server-side. app/auth/callback/route.ts handles it
//                   and never reaches this page. This is the customer flow.
//
//   IMPLICIT        A link minted by the admin API or by the Supabase dashboard has no
//                   flow state behind it, so GoTrue redirects to
//                   ...?next=/reset-password#access_token=...&refresh_token=...&type=recovery
//                   Everything useful is in the FRAGMENT, and a fragment is never sent to
//                   a server. The route sees no code and no token_hash, calls it
//                   missing_code, and sends the visitor here.
//
// Verified against this project: a real generate_link action_link produces exactly that
// second shape, and the fragment SURVIVES the route's 307 to this page, because the
// Location header carries no fragment of its own and browsers keep the original.
//
// That matters more than it looks. The project has no custom SMTP and is capped at about
// two emails an hour, so the practical way to rescue a locked-out customer today is to
// generate a recovery link by hand and send it. Those are exactly the links that arrive
// in this shape. Without the block below they dead-end on "that link didn't work" while
// the working credentials sit unread in the address bar.
// ─────────────────────────────────────────────────────────────────────────────────────

const REASONS: Record<string, string> = {
  otp_expired:
    'That link has expired. Email links are single use and they do not last forever, so this usually just means it sat in the inbox a while.',
  access_denied: 'That link has already been used, or it expired. Email links work once.',
  email_link_invalid: 'That link is not valid any more. It may have been used already.',
  validation_failed: 'That link was incomplete. It can get cut in half by some email clients.',
  missing_code: 'That link was incomplete. It can get cut in half by some email clients.',
  bad_type: 'That link was incomplete. It can get cut in half by some email clients.',
  // The three PKCE ones all mean the same thing to a reader: the link was opened
  // somewhere other than where it was started. pkce_code_verifier_not_found is the code
  // this project actually returns; the other two are older names for it.
  pkce_code_verifier_not_found:
    'That link was opened on a different device or browser from the one you asked for it on. Open it on that device, or ask for a new one below.',
  flow_state_not_found:
    'That link was opened on a different device or browser from the one you asked for it on. Open it on that device, or ask for a new one below.',
  flow_state_expired:
    'That link was opened on a different device or browser from the one you asked for it on. Open it on that device, or ask for a new one below.',
};

const GENERIC = 'That link could not be used. It has probably expired or been used already.';

export function AuthCodeError({
  reason,
  description,
}: {
  reason?: string;
  description?: string;
}) {
  const router = useRouter();
  // Starts as 'checking' on the server AND on the client, so there is no hydration
  // mismatch and no flash of an error we might be about to disprove.
  const [state, setState] = useState<'checking' | 'error'>('checking');

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const access_token = hash.get('access_token');
    const refresh_token = hash.get('refresh_token');

    if (!access_token || !refresh_token) {
      setState('error');
      return;
    }

    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (cancelled) return;
      if (error) {
        setState('error');
        return;
      }
      // Take the credentials out of the address bar before going anywhere. They are live
      // tokens and there is no reason to leave them in history or in a referrer.
      window.history.replaceState(null, '', window.location.pathname);
      const dest =
        hash.get('type') === 'recovery' ? '/reset-password' : await postAuthPath(supabase);
      router.replace(dest);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === 'checking') {
    return (
      <main className="container">
        <div className="auth-wrap">
          <div style={{ marginBottom: 28 }}>
            <BrandMark height={34} href="/" priority />
          </div>
          <h1>One moment</h1>
          <p className="sub">Checking that link.</p>
          {/* Without JS the check above can never run, so show the real outcome instead of
              leaving somebody on a spinner that will not resolve. */}
          <noscript>
            <div className="card">
              <p style={{ margin: 0 }}>
                {(reason && REASONS[reason]) || GENERIC} Turn on JavaScript, or ask for a new
                link from the sign-in page.
              </p>
            </div>
          </noscript>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="auth-wrap">
        <div style={{ marginBottom: 28 }}>
          <BrandMark height={34} href="/" priority />
        </div>
        <h1>That link didn’t work</h1>
        <p className="sub">{(reason && REASONS[reason]) || GENERIC}</p>

        <div className="card">
          <p style={{ margin: '0 0 18px' }}>
            Nothing is wrong with your account. Ask for a new link, or sign in if you know your
            password.
          </p>
          <Link href="/forgot-password" className="btn btn-primary btn-block">
            Send a new link
          </Link>
          <Link href="/login" className="btn btn-ghost btn-block" style={{ marginTop: 10 }}>
            Sign in
          </Link>
        </div>

        <p className="note">
          Still stuck? Email{' '}
          <a href="mailto:support@refit-iq.com" style={{ color: 'var(--accent)' }}>
            support@refit-iq.com
          </a>{' '}
          and we will sort it out.
        </p>

        {/* The raw reason, small and last. It is meaningless to the reader and the whole
            point of it is that they can paste it into a support email. */}
        {(reason || description) && (
          <p className="note" style={{ fontSize: 12, opacity: 0.6 }}>
            {[reason, description].filter(Boolean).join(': ')}
          </p>
        )}
      </div>
    </main>
  );
}
