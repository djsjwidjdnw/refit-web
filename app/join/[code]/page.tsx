import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { BrandMark } from '../../brand-mark';
import { JoinForm } from './join-form';
import { LeaveEmptyShop, SignOutHere } from './join-actions';

export const dynamic = 'force-dynamic';

// The invite link: https://refit-iq.com/join/<join_code>, from the app's Team > Invite sheet
// (link or QR). Jon, 2026-10-22: "a person opening an invite link currently sees Start free
// trial". It must say "Join <shop name>", with no trial, no billing and no plan picker, make
// the account, and leave them as a pending join request for the shop's admins to accept.
//
// What went wrong on 21 Oct (from the live API logs, see supabase/migrations/0064 in the app
// repo): a hire made his account on the TRIAL form, so he owned an empty shop of his own, and
// then this page told him "You already belong to a shop" four times until an admin moved him
// by hand. Signed out, this page also used to bounce to /signup?join=<code>, a generic "Join
// your shop" form with no shop name, under a link preview that said "FOR SHOP OWNERS … 14 days
// free".
//
// Now everything happens here, keyed off the code:
//   • signed out          → "Join <shop>": name, email, password; the account is made and the
//                           request filed in one go; or "Sign in to join <shop>".
//   • signed in, no shop  → the request is filed (request_join_shop_v2) and the page says so.
//   • asked already       → "Request sent".
//   • in the shop         → "You're in <shop>".
//   • owns an EMPTY shop  → offer to drop it and join (the 21 Oct trap), on a tap, not silently.
//   • in a real shop      → say which, and how to get out of it; never a dead "all set".
// A bad code gets no form at all: there is nothing to join.

const APP_STORE_URL = 'https://apps.apple.com/us/app/refit/id6772761520';

type Props = { params: Promise<{ code: string }> };

function cleanCode(raw: string): string {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

async function shopFor(code: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('join_invite_preview', { _join_code: code });
  const row = (Array.isArray(data) ? data[0] : null) as { shop_name?: string } | null;
  return row?.shop_name ?? null;
}

// The link preview a messaging app shows for the invite: the shop's name, never the owner
// pitch. The image beside it is app/join/[code]/opengraph-image.png, which has no trial copy.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const name = await shopFor(cleanCode(code));
  const title = name ? `Join ${name} on ReFitIQ` : 'Join your shop on ReFitIQ';
  const description = name
    ? `${name} tags every part on ReFitIQ as it comes off. Make your account from this link and an admin lets you in.`
    : 'Make your account from your shop’s invite link and an admin lets you in.';
  return {
    title,
    description,
    openGraph: { title, description, siteName: 'ReFitIQ', type: 'website' },
    robots: { index: false, follow: false },
  };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="container">
      <div className="auth-wrap">
        <div style={{ marginBottom: 28 }}>
          <BrandMark height={34} href="/" priority />
        </div>
        {children}
      </div>
    </main>
  );
}

function GetTheApp({ email }: { email: string | null | undefined }) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <p style={{ margin: 0 }}>
        Get the ReFitIQ app and sign in{email ? <> with <strong>{email}</strong></> : null}. Your shop shows up
        as soon as you are let in.
      </p>
      <p className="note" style={{ textAlign: 'left', marginTop: 12 }}>
        <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 700 }}>
          iPhone: App Store →
        </a>
        <br />
        <a href="/android" style={{ color: 'var(--accent)', fontWeight: 700 }}>
          Android: download the app →
        </a>
      </p>
    </div>
  );
}

export default async function JoinPage({ params }: Props) {
  const { code } = await params;
  const joinCode = cleanCode(code);
  const supabase = await createClient();
  const shopName = await shopFor(joinCode);

  if (!shopName) {
    return (
      <Shell>
        <h1>This invite link is not valid</h1>
        <p className="sub">There is no shop with that code. Ask your shop admin to send you the link again.</p>
      </Shell>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Shell>
        <JoinForm code={joinCode} shopName={shopName} />
      </Shell>
    );
  }

  type JoinState = { state: string; shop_name?: string; own_shop_name?: string };
  const { data: stateData, error: stateErr } = await supabase.rpc('my_join_state', { _join_code: joinCode });
  let st = (stateData ?? null) as JoinState | null;
  let rpcError: string | null = stateErr?.message ?? null;

  // Signed in with no shop and no request to this one yet: file it now, the way the old page
  // did. A request to a DIFFERENT shop is replaced, as request_join_shop always has.
  if (st && st.state === 'none') {
    const { data, error } = await supabase.rpc('request_join_shop_v2', {
      _join_code: joinCode,
      _leave_empty_shop: false,
    });
    const status = (data as { status?: string } | null)?.status;
    if (error) rpcError = error.message;
    else if (status === 'requested') st = { ...st, state: 'pending_here' };
  }

  const whoLine = (
    <p className="note" style={{ textAlign: 'left', marginTop: 20 }}>
      Signed in as <strong>{user.email}</strong>. <SignOutHere />
    </p>
  );

  if (rpcError || !st) {
    return (
      <Shell>
        <h1>Could not join {shopName}</h1>
        <p className="sub">{rpcError ?? 'Something went wrong. Refresh this page to try again.'}</p>
        {whoLine}
      </Shell>
    );
  }

  if (st.state === 'member_here') {
    return (
      <Shell>
        <h1>You are in {shopName}</h1>
        <p className="sub">This account is already part of {shopName}.</p>
        <GetTheApp email={user.email} />
        {whoLine}
      </Shell>
    );
  }

  if (st.state === 'pending_here') {
    return (
      <Shell>
        <h1>Request sent</h1>
        <p className="sub">
          An admin at <strong>{shopName}</strong> has been asked to let you in. They pick your role in the app.
        </p>
        <GetTheApp email={user.email} />
        {whoLine}
      </Shell>
    );
  }

  if (st.state === 'empty_shop') {
    return (
      <Shell>
        <h1>Join {shopName}</h1>
        <p className="sub">
          This account also has a shop of its own, <strong>{st.own_shop_name}</strong>, with nothing in it yet.
          An account belongs to one shop, so joining {shopName} removes it.
        </p>
        <LeaveEmptyShop code={joinCode} shopName={shopName} />
        {whoLine}
      </Shell>
    );
  }

  // other_shop: a real shop, with people, boats or billing in it. Nothing is changed here.
  return (
    <Shell>
      <h1>This account is in another shop</h1>
      <p className="sub">
        <strong>{user.email}</strong> belongs to <strong>{st.own_shop_name}</strong>, and an account belongs to one
        shop at a time.
      </p>
      <div className="card">
        <p style={{ margin: 0 }}>
          To join {shopName} with this email, ask an admin at {st.own_shop_name} to remove you first, then open this
          link again. Or sign out and join with a different email.
        </p>
      </div>
      {whoLine}
      <p className="note" style={{ marginTop: 16 }}>
        <Link href="/dashboard" style={{ color: 'var(--accent)' }}>
          Go to your dashboard →
        </Link>
      </p>
    </Shell>
  );
}
