import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { BrandMark } from '../brand-mark';
import { ResetPasswordForm } from './reset-password-form';

export const metadata: Metadata = {
  title: 'Set a new password',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

// Where a recovery link ends up, one hop after /auth/callback has turned it into a
// session. By the time this renders the visitor is fully signed in, which is how
// updateUser({ password }) is allowed to work at all.
//
// The session check happens HERE, on the server, rather than in the form. Doing it in the
// client would paint the password fields first and then yank them away, and the case that
// gets it wrong is the common one: somebody opening a months-old email, or opening the
// link on a different phone from the one that asked for it. They should never see a form
// they cannot submit.
//
// This page is NOT behind the middleware gate (that only covers /dashboard and /ops), and
// it should not be: the guard it needs is "do you hold a live recovery session", which is
// exactly the getUser() below, and a middleware bounce to /login would strand somebody who
// by definition cannot sign in.
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="container">
        <div className="auth-wrap">
          <div style={{ marginBottom: 28 }}>
            <BrandMark height={34} href="/" priority />
          </div>
          <h1>That link didn’t work</h1>
          <p className="sub">
            It has expired, or it was used already, or it was opened in a different browser from
            the one that asked for it. Reset links only work once, and only where they were
            requested.
          </p>
          <div className="card">
            <p style={{ margin: '0 0 18px' }}>
              Ask for a new one and open it on this device. Nothing is wrong with your account.
            </p>
            <Link href="/forgot-password" className="btn btn-primary btn-block">
              Send a new link
            </Link>
            <Link
              href="/login"
              className="btn btn-ghost btn-block"
              style={{ marginTop: 10 }}
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <ResetPasswordForm email={user.email ?? ''} />;
}
