import Link from 'next/link';
import type { Metadata } from 'next';
import { BrandMark } from '../../brand-mark';

export const metadata: Metadata = {
  title: 'That link didn’t work',
  // Nothing here should ever be indexed or shared: the URL only exists as the failure
  // branch of an email link and it carries the reason in a query param.
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

// Where app/auth/callback/route.ts sends anyone whose email link could not be turned into
// a session. The failure is almost always the boring one (the link was already used, or
// it sat in an inbox too long), and the only thing the reader needs is a way to get
// another one. So: say what happened in a sentence, then put the two doors on the screen.
//
// Copy rules are the ones at the top of app/page.tsx. In particular this page must not
// apologise at length or explain PKCE to a boatyard owner.

// Supabase's error_code values, plus the two this route raises itself. Anything not on
// the list falls through to the generic line, which is true of every case.
const REASONS: Record<string, string> = {
  otp_expired:
    'That link has expired. Email links are single use and they do not last forever, so this usually just means it sat in the inbox a while.',
  access_denied:
    'That link has already been used, or it expired. Email links work once.',
  email_link_invalid: 'That link is not valid any more. It may have been used already.',
  validation_failed: 'That link was incomplete. It can get cut in half by some email clients.',
  missing_code: 'That link was incomplete. It can get cut in half by some email clients.',
  bad_type: 'That link was incomplete. It can get cut in half by some email clients.',
  // The three PKCE ones all mean the same thing to a reader: the link was opened
  // somewhere other than where it was started. pkce_code_verifier_not_found is the code
  // this project actually returns, observed by firing a junk ?code= at the route against
  // a real build; the other two are the older names for it. Worth spelling out plainly,
  // because "open it on the phone you signed up on" is a fix the reader can carry out and
  // is not guessable from anything else on the screen.
  pkce_code_verifier_not_found:
    'That link was opened on a different device or browser from the one you signed up on. Open it on that device, or start again below and we will send a new one.',
  flow_state_not_found:
    'That link was opened on a different device or browser from the one you signed up on. Open it on that device, or start again below and we will send a new one.',
  flow_state_expired:
    'That link was opened on a different device or browser from the one you signed up on. Open it on that device, or start again below and we will send a new one.',
};

const GENERIC = 'That link could not be used. It has probably expired or been used already.';

export default async function AuthCodeError({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; description?: string }>;
}) {
  const { reason, description } = await searchParams;
  const message = (reason && REASONS[reason]) || GENERIC;

  return (
    <main className="container">
      <div className="auth-wrap">
        <div style={{ marginBottom: 28 }}>
          <BrandMark height={34} href="/" priority />
        </div>
        <h1>That link didn’t work</h1>
        <p className="sub">{message}</p>

        <div className="card">
          <p style={{ margin: '0 0 18px' }}>
            Nothing is wrong with your account. Sign in if you already have one, or start again
            and we will send a new link.
          </p>
          <Link href="/login" className="btn btn-primary btn-block">
            Sign in
          </Link>
          <Link
            href="/signup?src=auth-error"
            className="btn btn-ghost btn-block"
            style={{ marginTop: 10 }}
          >
            Start your free trial
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
