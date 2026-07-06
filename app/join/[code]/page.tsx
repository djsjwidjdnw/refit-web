import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Invite-acceptance landing. The admin shares https://refit-iq.com/join/<join_code>
// (link or QR). Behaviour:
//   • signed out          → /signup?join=<code> (carry the code; replayed after signup)
//   • signed in, has shop → "already in a shop" (single-shop model)
//   • signed in, no shop  → request_join_shop(code) then show "waiting for approval"
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const joinCode = decodeURIComponent(code).trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not signed in → route through signup carrying the code (redirect() throws, so `user`
  // is non-null below).
  if (!user) redirect(`/signup?join=${encodeURIComponent(joinCode)}`);

  const { data: members } = await supabase
    .from('shop_members')
    .select('shop_id')
    .eq('user_id', user.id)
    .limit(1);
  const alreadyMember = !!members && members.length > 0;

  let rpcError: string | null = null;
  if (!alreadyMember) {
    const { error } = await supabase.rpc('request_join_shop', { _join_code: joinCode });
    if (error) rpcError = error.message;
  }

  const { data: pending } = await supabase.rpc('my_pending_join');
  const req = (Array.isArray(pending) ? pending[0] : null) as
    | { shop_name: string }
    | null;

  return (
    <main className="container">
      <div className="auth-wrap">
        <div className="brand" style={{ marginBottom: 28 }}>
          Re<span>Fit</span>
        </div>

        {alreadyMember ? (
          <>
            <h1>You’re all set</h1>
            <p className="sub">You already belong to a shop.</p>
            <div className="card">
              <p style={{ margin: 0 }}>
                Your account is already part of a shop, so this invite doesn’t apply. Open your
                dashboard to manage your plan and seats.
              </p>
            </div>
          </>
        ) : req ? (
          <>
            <h1>Request sent</h1>
            <p className="sub">
              Waiting for an admin at <strong>{req.shop_name}</strong> to approve you.
            </p>
            <div className="card">
              <p style={{ margin: 0 }}>
                You’ll get access to <strong>{req.shop_name}</strong> as soon as an admin approves
                you in the ReFit app. You can close this page — nothing else is needed.
              </p>
            </div>
          </>
        ) : (
          <>
            <h1>Couldn’t join</h1>
            <p className="sub">{rpcError ?? 'That invite link didn’t work.'}</p>
            <div className="card">
              <p style={{ margin: 0 }}>
                Double-check the invite link with your shop admin, or ask them to send a new one.
              </p>
            </div>
          </>
        )}

        <p className="note" style={{ marginTop: 24 }}>
          <Link href="/dashboard" style={{ color: 'var(--accent)' }}>
            Go to dashboard →
          </Link>
        </p>
      </div>
    </main>
  );
}
