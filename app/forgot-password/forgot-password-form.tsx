'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BrandMark } from '../brand-mark';

// ─────────────────────────────────────────────────────────────────────────────────────
// "I can't get in." Until this page existed there was no answer to that: no reset link
// on /login, no resetPasswordForEmail call anywhere in the codebase, and the app is
// sign-in only. A customer who forgot their password had to email support.
//
// TWO THINGS HERE ARE DELIBERATE AND EASY TO UNDO BY ACCIDENT.
//
// 1. THE CONFIRMATION IS THE SAME WHETHER OR NOT THE ACCOUNT EXISTS. Telling the reader
//    "no account on that email" turns this form into a checker for whether a given
//    address is a ReFitIQ customer, which is a disclosure we do not have to make. So the
//    success panel is shown on the ordinary error path too, and it is phrased "if there
//    is an account" rather than "we sent it". Do not add a "no account found" branch.
//
// 2. RATE LIMITS ARE THE ONE ERROR THAT IS SURFACED. A 429 is a property of the project,
//    not of the address typed in, so showing it leaks nothing, and swallowing it would
//    be a lie: the reader would sit waiting for mail that was never sent. This matters
//    right now, because the project has no custom SMTP and is on Supabase's shared
//    sender at roughly two emails an hour.
// ─────────────────────────────────────────────────────────────────────────────────────

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      // Straight at the callback that already exists, carrying where to go afterwards.
      // ?next= is read and sanitised by app/auth/callback/route.ts, and that route also
      // recognises a recovery independently of this parameter, so the flow still lands on
      // the right page if the query is ever dropped in transit.
      redirectTo: `${window.location.origin}/auth/callback?next=%2Freset-password`,
    });

    setBusy(false);

    // See note 2 above. Everything else, including "user not found", falls through to the
    // neutral panel on purpose.
    if (err && (err.status === 429 || /rate limit|too many/i.test(err.message))) {
      setError(
        'Too many reset emails have gone out in the last hour. Wait a few minutes and try again, or email support@refit-iq.com and we will do it by hand.',
      );
      return;
    }

    setSent(true);
  }

  return (
    <main className="container">
      <div className="auth-wrap">
        <div style={{ marginBottom: 28 }}>
          <BrandMark height={34} href="/" priority />
        </div>

        {sent ? (
          <>
            <h1>Check your email</h1>
            <p className="sub">
              If there is a ReFitIQ account on {email.trim() || 'that address'}, a link to set a
              new password is on its way.
            </p>
            <div className="card">
              {/* Not a nicety. The reset link carries a PKCE code whose verifier is stored
                  in the browser that asked for it, so opening the mail on a different
                  phone or a different browser genuinely fails. Saying so here is cheaper
                  than the support ticket. */}
              <p style={{ margin: '0 0 14px' }}>
                Open the link on this device, in this browser. A reset link only works where it
                was asked for.
              </p>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                If nothing arrives in a few minutes, look in the spam folder, then try again.
              </p>
            </div>
            <p className="note">
              <Link href="/login" style={{ color: 'var(--accent)' }}>
                Back to sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1>Reset your password</h1>
            <p className="sub">
              Put in the email you signed up with and we will send you a link to set a new one.
            </p>
            <form onSubmit={onSubmit}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error && <div className="error">{error}</div>}
              <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send the link'}
              </button>
            </form>
            <p className="note">
              Remembered it?{' '}
              <Link href="/login" style={{ color: 'var(--accent)' }}>
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
