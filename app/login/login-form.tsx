'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { postAuthPath } from '@/lib/auth/post-auth-path';
import { BrandMark } from '../brand-mark';

// `next` is already sanitised by the page (safeNext). Jon, 2026-10-22 #6: an invite link's
// "Sign in to join <shop>" comes here with next=/join/<code>, so the person lands back on the
// invite signed in, and the "no account" line sends them back to it rather than to a trial.
export function LoginForm({ next }: { next: string | null }) {
  const joining = !!next && next.startsWith('/join/');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    // Route platform operators to their cockpit; everyone else to the customer dashboard.
    // Shared with app/auth/callback/route.ts so a password sign-in and an email-link
    // sign-in land in the same place. is_platform_operator is DB-gated and evaluated for
    // the just-signed-in session's uid.
    router.push(next ?? (await postAuthPath(supabase)));
    router.refresh();
  }

  return (
    <main className="container">
      <div className="auth-wrap">
        <div style={{ marginBottom: 28 }}>
          <BrandMark height={34} href="/" priority />
        </div>
        <h1>Sign in</h1>
        <p className="sub">
          {joining
            ? 'Sign in, and your shop’s invite picks up where it left off.'
            : 'Billing and seats live here. The work happens in the app.'}
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
            />
          </div>
          <div className="field">
            <div className="field-row">
              <label htmlFor="password">Password</label>
              <Link href="/forgot-password" className="field-link">
                Forgot your password?
              </Link>
            </div>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="note">
          {joining ? (
            <>
              No account yet?{' '}
              <Link href={next!} style={{ color: 'var(--accent)' }}>
                Make one from the invite
              </Link>
            </>
          ) : (
            <>
              No account? <Link href="/signup" style={{ color: 'var(--accent)' }}>Start a free trial</Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
