'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    // If email confirmation is required, no session is returned — tell the user to confirm.
    if (data.session) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setBusy(false);
      setConfirmMsg('Check your email to confirm your account, then sign in.');
    }
  }

  return (
    <main className="container">
      <div className="auth-wrap">
        <div className="brand" style={{ marginBottom: 28 }}>
          Re<span>Fit</span>
        </div>
        <h1>Start your free trial</h1>
        <p className="sub">14 days free. Set up your shop in minutes.</p>
        {confirmMsg ? (
          <div className="card">
            <p style={{ margin: 0 }}>{confirmMsg}</p>
            <p className="note" style={{ textAlign: 'left', marginTop: 16 }}>
              <Link href="/login" style={{ color: 'var(--accent)' }}>Go to sign in →</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="email">Work email</label>
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
              <input
                id="password"
                className="input"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="error">{error}</div>}
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}
        <p className="note">
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
        </p>
      </div>
    </main>
  );
}
