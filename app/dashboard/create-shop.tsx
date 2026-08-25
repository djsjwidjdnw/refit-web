'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { trackMeta } from '../meta-pixel';
import { DEFAULT_INDUSTRY, INDUSTRY_OPTIONS, industryOption, isIndustryValue, type IndustryValue } from '@/lib/industries';

// Shown on /dashboard when a signed-in user has no shop yet (fresh signup, or email
// confirmation was required so provisioning didn't run at signup). Calls the same
// SECURITY DEFINER RPC as signup (provision_new_shop_v2, migration 0048) → shop + admin
// + 14-day trial + the trade vocabulary.
//
// `defaultIndustry` is replayed out of user_metadata.shop_industry, which signup stashed
// there for exactly this path: a user who picked Automotive and then hit the confirmation
// gap must not silently come back as marine.
export function CreateShop({
  defaultName,
  defaultIndustry,
}: {
  defaultName?: string;
  defaultIndustry?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName ?? '');
  const [industry, setIndustry] = useState<IndustryValue>(
    isIndustryValue(defaultIndustry) ? defaultIndustry : DEFAULT_INDUSTRY,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().rpc('provision_new_shop_v2', {
      _shop_name: name.trim(),
      _industry: industry,
    });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    // The other half of the signup conversion (see signup-form.tsx): this card only exists
    // when provisioning didn't run at signup, so firing here can never double-count.
    trackMeta('CompleteRegistration');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ marginTop: 16, maxWidth: 460 }}>
      <h2 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 6px' }}>Create your shop</h2>
      <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: 18 }}>
        Name your shop and the 14-day trial starts. Your own admin seat is free.
      </p>
      <div className="field">
        <label htmlFor="newshop">Shop / business name</label>
        <input
          id="newshop"
          className="input"
          type="text"
          placeholder={industryOption(industry).shopExample}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="newshop-industry">What does your shop work on?</label>
        <select
          id="newshop-industry"
          className="input"
          value={industry}
          onChange={(e) => setIndustry(e.target.value as IndustryValue)}
          required
        >
          {INDUSTRY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {error && <div className="error">{error}</div>}
      <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
        {busy ? 'Creating…' : 'Create shop & start trial'}
      </button>
    </form>
  );
}
