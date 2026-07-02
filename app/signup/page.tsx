'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [shopName, setShopName] = useState('');
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
    // Stash the shop name in user metadata so provisioning can still use it if email
    // confirmation is on (the shop then gets created on the first authenticated load).
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { shop_name: shopName.trim() } },
    });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    if (data.session) {
      // Session in hand → provision the shop + 14-day trial atomically (SECURITY DEFINER
      // RPC, migration 0028). If the RPC isn't applied yet the dashboard's create-shop
      // step handles it, so don't block the user on that error.
      await supabase.rpc('provision_new_shop', { _shop_name: shopName.trim() });
      router.push('/dashboard');
      router.refresh();
    } else {
      setBusy(false);
      setConfirmMsg(
        "Check your email to confirm your account, then sign in — we'll finish setting up your shop.",
      );
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
              <label htmlFor="shop">Shop / business name</label>
              <input
                id="shop"
                className="input"
                type="text"
                placeholder="e.g. Bradshaw Marine"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required
              />
            </div>
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
