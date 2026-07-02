'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Shown on /dashboard when a signed-in user has no shop yet (fresh signup, or email
// confirmation was required so provisioning didn't run at signup). Calls the same
// SECURITY DEFINER RPC (provision_new_shop, migration 0028) → shop + admin + 14-day trial.
export function CreateShop({ defaultName }: { defaultName?: string }) {
  const router = useRouter();
  const [name, setName] = useState(defaultName ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().rpc('provision_new_shop', { _shop_name: name.trim() });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ marginTop: 16, maxWidth: 460 }}>
      <h2 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 6px' }}>Create your shop</h2>
      <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: 18 }}>
        Name your shop to start your 14-day free trial. You&apos;re the admin — your seat is free.
      </p>
      <div className="field">
        <label htmlFor="newshop">Shop / business name</label>
        <input
          id="newshop"
          className="input"
          type="text"
          placeholder="e.g. Bradshaw Marine"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      {error && <div className="error">{error}</div>}
      <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
        {busy ? 'Creating…' : 'Create shop & start trial'}
      </button>
    </form>
  );
}
