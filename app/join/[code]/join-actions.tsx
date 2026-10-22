'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { trackFunnel } from '@/lib/analytics';

// The two buttons the signed-in states of /join/<code> need. Both end in router.refresh(), so
// the server page re-reads where the account stands and shows the next state itself.

/**
 * The 21 Oct trap: the account owns an EMPTY shop (made on the trial form by mistake). Joining
 * drops it, which request_join_shop_v2 does only when told to, and only if it is still empty
 * (nobody else in it, no boats, no billing); otherwise the page shows why not.
 */
export function LeaveEmptyShop({ code, shopName }: { code: string; shopName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      {error && <div className="error">{error}</div>}
      <button
        className="btn btn-primary btn-block"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const { error: err } = await createClient().rpc('request_join_shop_v2', {
            _join_code: code,
            _leave_empty_shop: true,
          });
          if (err) {
            setBusy(false);
            setError(err.message);
            return;
          }
          trackFunnel('join_requested');
          router.refresh();
        }}
      >
        {busy ? 'Sending…' : `Join ${shopName}`}
      </button>
    </>
  );
}

/** "Not you?": signs out and stays on the invite, which then offers its form. */
export function SignOutHere() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="field-link"
      style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--accent)', font: 'inherit' }}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await createClient().auth.signOut();
        router.refresh();
      }}
    >
      {busy ? 'Signing out…' : 'Not you? Sign out'}
    </button>
  );
}
