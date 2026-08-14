'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { trackFunnel, ctaSource } from '@/lib/analytics';
import { BrandMark } from '../brand-mark';

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
  const [started, setStarted] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  // "signup_started" = first real interaction with a field. Firing on mount instead would
  // just duplicate the /signup pageview and hide the real drop-off between the two.
  function markStarted() {
    if (started) return;
    setStarted(true);
    trackFunnel('signup_started', { mode: joining ? 'join' : 'create', src: ctaSource() });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    trackFunnel('signup_submitted', { mode: joining ? 'join' : 'create', src: ctaSource() });
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
      const dup = /already registered|already been registered|User already/i.test(signUpErr.message);
      setAlreadyRegistered(dup);
      setError(
        dup
          ? 'That email already has a ReFitIQ account.'
          : signUpErr.message,
      );
      trackFunnel('signup_failed', { mode: joining ? 'join' : 'create', reason: dup ? 'duplicate' : 'other' });
      return;
    }

    if (data.session) {
      // Session in hand → act now. (No session ⇒ email confirmation is on; the metadata
      // above is replayed on first authed load, so we just tell them to check their email.)
      if (joining) {
        await supabase.rpc('request_join_shop', { _join_code: joinCode! });
        trackFunnel('join_requested');
        router.push('/dashboard');
      } else {
        const { error: provisionErr } = await supabase.rpc('provision_new_shop', {
          _shop_name: shopName.trim(),
        });
        // The trial starts inside provision_new_shop, so a clean return is the moment the
        // funnel actually converts. On failure the dashboard's CreateShop card recovers it.
        trackFunnel(provisionErr ? 'signup_failed' : 'shop_created', { src: ctaSource() });
        if (!provisionErr) trackFunnel('trial_active', { src: ctaSource() });
        router.push('/dashboard');
      }
      router.refresh();
    } else {
      setBusy(false);
      setConfirmMsg(
        joining
          ? "Check your email to confirm your account, then sign in. We'll send your join request to the shop for approval."
          : "Check your email to confirm your account, then sign in. We'll finish setting up your shop.",
      );
    }
  }

  return (
    <main className="container">
      <div className="auth-wrap">
        <div style={{ marginBottom: 28 }}>
          <BrandMark height={34} href="/" priority />
        </div>
        <h1>{joining ? 'Join your shop' : 'Start your free trial'}</h1>
        <p className="sub">
          {joining
            ? 'Create your account. Your shop admin approves you and you’re in.'
            : '14 days free. Cancel anytime, no charge.'}
        </p>
        {/* Two lines, not three. The old set was a list of three in rhythm, each with a ✓
            glyph in front of it, which is the shape of a generated pricing page. These
            two answer what a cold visitor is weighing at the moment he looks at a form:
            what the 14 days give him, and when money is ever involved. Say the second one
            as the offer, never as a denial — see the house-style block in app/page.tsx. */}
        {!joining && (
          <ul className="reassure">
            <li>Every feature for 14 days, with no limit on how many techs you add.</li>
            <li>You only pay if you pick a plan at the end. Cancel before then and that is that.</li>
          </ul>
        )}
        {confirmMsg ? (
          <div className="card">
            <p style={{ margin: 0 }}>{confirmMsg}</p>
            <p className="note" style={{ textAlign: 'left', marginTop: 16 }}>
              <Link href="/login" style={{ color: 'var(--accent)' }}>
                Go to sign in →
              </Link>
            </p>
            <p className="note" style={{ textAlign: 'left', marginTop: 8 }}>
              <Link href="/getting-started" style={{ color: 'var(--accent)' }}>
                Read the 15-minute setup guide →
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} onFocus={markStarted}>
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
                  autoComplete="organization"
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
                    <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                      Sign in instead →
                    </Link>
                  </>
                )}
              </div>
            )}
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy
                ? 'Creating account…'
                : joining
                  ? 'Create account & request to join'
                  : 'Start my free trial'}
            </button>
            {!joining && (
              <p className="note" style={{ marginTop: 12 }}>
                Nothing is charged during the 14 days. Cancel anytime.
              </p>
            )}
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
