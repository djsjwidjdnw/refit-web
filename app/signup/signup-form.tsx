'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// Two modes, decided by whether an invite code was carried in via /signup?join=<code>
// (usually because the tech tapped an admin's invite link, which routes through
// /join/<code> → here when signed out):
//   • JOIN  — no shop name; on submit we record a request against the invited shop
//             (request_join_shop) and land on the dashboard's "waiting for approval" state.
//   • CREATE — the original flow: name a new shop, provision it + a 14-day trial.
// Either way the code / shop name is also stashed in user_metadata so it survives the
// email-confirmation gap (replayed on first authed load — see lib/join + dashboard).
export function SignupForm({ joinCode }: { joinCode: string | null }) {
  const router = useRouter();
  const joining = joinCode != null;

  const [shopName, setShopName] = useState('');
  const [name, setName] = useState('');
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

    const meta: Record<string, string> = joining
      ? {
          pending_join_code: joinCode!.toUpperCase(),
          ...(name.trim() ? { display_name: name.trim() } : {}),
        }
      : { shop_name: shopName.trim() };

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta },
    });
    if (signUpErr) {
      setBusy(false);
      setError(signUpErr.message);
      return;
    }

    if (data.session) {
      // Session in hand → act now. (No session ⇒ email confirmation is on; the metadata
      // above is replayed on first authed load, so we just tell them to check their email.)
      if (joining) {
        await supabase.rpc('request_join_shop', { _join_code: joinCode! });
        router.push('/dashboard');
      } else {
        await supabase.rpc('provision_new_shop', { _shop_name: shopName.trim() });
        router.push('/dashboard');
      }
      router.refresh();
    } else {
      setBusy(false);
      setConfirmMsg(
        joining
          ? "Check your email to confirm your account, then sign in — we'll send your join request to the shop for approval."
          : "Check your email to confirm your account, then sign in — we'll finish setting up your shop.",
      );
    }
  }

  return (
    <main className="container">
      <div className="auth-wrap">
        <div className="brand" style={{ marginBottom: 28 }}>
          Re<span>Fit</span>
        </div>
        <h1>{joining ? 'Join your shop' : 'Start your free trial'}</h1>
        <p className="sub">
          {joining
            ? 'Create your account — your shop admin approves you and you’re in.'
            : '14 days free. Set up your shop in minutes.'}
        </p>
        {confirmMsg ? (
          <div className="card">
            <p style={{ margin: 0 }}>{confirmMsg}</p>
            <p className="note" style={{ textAlign: 'left', marginTop: 16 }}>
              <Link href="/login" style={{ color: 'var(--accent)' }}>
                Go to sign in →
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            {joining ? (
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
            ) : (
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
            )}
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
              {busy
                ? joining
                  ? 'Creating account…'
                  : 'Creating account…'
                : joining
                  ? 'Create account & request to join'
                  : 'Create account'}
            </button>
          </form>
        )}
        <p className="note">
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--accent)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
