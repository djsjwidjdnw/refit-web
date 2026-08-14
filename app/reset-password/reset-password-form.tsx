'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { postAuthPath } from '@/lib/auth/post-auth-path';
import { BrandMark } from '../brand-mark';

// 6 because that is what the Supabase project enforces (password_min_length = 6) and what
// /signup already asks for. Checking it here is a courtesy that saves a round trip; the
// server is still the thing that decides. If the project's minimum is ever raised, raise
// this and app/signup/signup-form.tsx's minLength together, or this form will promise
// something the server rejects.
//
// Checked in JS rather than with a `minLength` attribute on the inputs, deliberately.
// With the attribute the browser refuses to submit and shows its own unstyled tooltip,
// so onSubmit never runs: the styled .error below becomes dead code for the too-short
// case while still being the only way to report a mismatch. That is two failure modes
// with two completely different presentations, and the wording of one of them is not
// ours to write. Caught by the e2e run, which sat waiting 30s for .error to appear.
const MIN_LENGTH = 6;

export function ResetPasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Checked in this order because it is the order the reader made the mistakes in.
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords are not the same.');
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) {
      setBusy(false);
      // The session can die between the page rendering and the form being submitted, and
      // when it does the fix is a new link rather than a different password. Anything
      // else is shown as the server phrased it, because the useful ones are specific
      // ("New password should be different from the old password").
      if (err.status === 401 || /session|jwt|expired/i.test(err.message)) {
        setExpired(true);
        return;
      }
      setError(err.message);
      return;
    }

    // Same destination logic as /login and /auth/callback, so an operator resetting a
    // password lands in the cockpit rather than the customer dashboard.
    router.push(await postAuthPath(supabase));
    router.refresh();
  }

  if (expired) {
    return (
      <main className="container">
        <div className="auth-wrap">
          <div style={{ marginBottom: 28 }}>
            <BrandMark height={34} href="/" priority />
          </div>
          <h1>That link ran out</h1>
          <p className="sub">
            The reset link expired while this page was open, so the new password was not saved.
          </p>
          <div className="card">
            <p style={{ margin: '0 0 18px' }}>Ask for a fresh one and it will only take a minute.</p>
            <Link href="/forgot-password" className="btn btn-primary btn-block">
              Send a new link
            </Link>
          </div>
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
        <h1>Set a new password</h1>
        <p className="sub">
          {email ? `For ${email}. ` : ''}
          Pick something you will remember. At least {MIN_LENGTH} characters.
        </p>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="password">New password</label>
            <div className="pw-wrap">
              <input
                id="password"
                className="input"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor="confirm">New password again</label>
            {/* Deliberately NOT type={showPw}. The point of the second field is to catch a
                typo in the first, and it cannot do that if both are revealed and the
                reader copies what they see. */}
            <input
              id="confirm"
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save the new password'}
          </button>
        </form>
        <p className="note">
          You are signed in on this device already, so this is the last step.
        </p>
      </div>
    </main>
  );
}
