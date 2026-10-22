'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { trackFunnel } from '@/lib/analytics';

// The signed-out half of /join/<code> (Jon, 2026-10-22 #6). Joining a shop, never starting
// one: no shop name, no trade, no trial, no billing, no plan. Submitting makes the account and
// files the join request in the same tap, then the page re-renders signed in and says
// "Request sent". The shop's admins are notified by the database (0059), and pick the role.
//
// The code is also stashed in user_metadata (pending_join_code) so that if email confirmation
// is ever turned on, the dashboard's replayPendingJoin files the request on first sign-in
// (lib/join.ts). With confirmation off, as today, signUp returns a session and this files it.
export function JoinForm({ code, shopName }: { code: string; shopName: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const signInHref = `/login?next=${encodeURIComponent(`/join/${code}`)}`;

  function markStarted() {
    if (started) return;
    setStarted(true);
    trackFunnel('signup_started', { mode: 'join' });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setAlreadyRegistered(false);
    trackFunnel('signup_submitted', { mode: 'join' });
    const supabase = createClient();
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          pending_join_code: code.toUpperCase(),
          ...(name.trim() ? { display_name: name.trim() } : {}),
        },
        // Inert while confirmation is off; see the note on the trial form.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/join/${code}`)}`,
      },
    });
    if (signUpErr) {
      setBusy(false);
      const dup = /already registered|already been registered|User already/i.test(signUpErr.message);
      setAlreadyRegistered(dup);
      setError(dup ? 'That email already has a ReFitIQ account.' : signUpErr.message);
      trackFunnel('signup_failed', { mode: 'join', reason: dup ? 'duplicate' : 'other' });
      return;
    }
    if (!data.session) {
      setBusy(false);
      setConfirmMsg(`Check your email to confirm your account, then open this invite link again to join ${shopName}.`);
      return;
    }
    const { error: reqErr } = await supabase.rpc('request_join_shop_v2', {
      _join_code: code,
      _leave_empty_shop: false,
    });
    if (reqErr) {
      setBusy(false);
      setError(reqErr.message);
      trackFunnel('signup_failed', { mode: 'join', reason: 'request' });
      return;
    }
    trackFunnel('join_requested');
    // The server page reads the new session and shows "Request sent".
    router.refresh();
  }

  if (confirmMsg) {
    return (
      <>
        <h1>Join {shopName}</h1>
        <div className="card">
          <p style={{ margin: 0 }}>{confirmMsg}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>Join {shopName}</h1>
      <p className="sub">
        Make your ReFitIQ account. An admin at {shopName} lets you in, then you sign in to the app.
      </p>
      <form onSubmit={onSubmit} onFocus={markStarted}>
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input
            id="name"
            className="input"
            type="text"
            placeholder="e.g. Sam Rivera"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
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
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="pw-wrap">
            <input
              id="password"
              className="input"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-describedby="pw-hint"
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
          <p id="pw-hint" className="field-hint">
            At least 6 characters.
          </p>
        </div>
        {error && (
          <div className="error">
            {error}
            {alreadyRegistered && (
              <>
                {' '}
                <Link href={signInHref} style={{ color: 'var(--accent)', fontWeight: 700 }}>
                  Sign in to join {shopName} →
                </Link>
              </>
            )}
          </div>
        )}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Creating account…' : `Join ${shopName}`}
        </button>
      </form>
      <p className="note">
        Already have a ReFitIQ account?{' '}
        <Link href={signInHref} style={{ color: 'var(--accent)' }}>
          Sign in to join {shopName}
        </Link>
      </p>
    </>
  );
}
