'use client';

import { useState, useTransition } from 'react';
import { compShop, extendTrial, cancelShop, reactivateShop, setEnterprise } from './actions';

// Per-shop operator actions. Each button confirms, then calls a SERVER ACTION (which re-checks
// the operator gate AND calls the DB-gated RPC). No client-trusted mutation. Read-only drill-in
// otherwise — impersonation is intentionally NOT built in v1.
export function ShopActions({
  shopId,
  isEnterprise,
}: {
  shopId: string;
  isEnterprise: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const run = (label: string, confirmText: string, fn: () => Promise<void>) => {
    if (!window.confirm(confirmText)) return;
    setMsg(null);
    startTransition(async () => {
      try {
        await fn();
        setMsg(`${label} ✓`);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'Action failed');
      }
    });
  };

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 800, marginBottom: 10 }}>Actions</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          className="btn btn-ghost"
          disabled={pending}
          onClick={() => run('Comped', 'Comp this shop? It becomes free + active and manually managed (Stripe won’t change it).', () => compShop(shopId))}
        >
          Comp
        </button>
        <button
          className="btn btn-ghost"
          disabled={pending}
          onClick={() => run('Trial extended', 'Extend this shop’s trial by 14 days?', () => extendTrial(shopId, 14))}
        >
          Extend trial +14d
        </button>
        <button
          className="btn btn-ghost"
          disabled={pending}
          onClick={() => run('Reactivated', 'Reactivate this shop (active, clear the grace clock)?', () => reactivateShop(shopId))}
        >
          Reactivate
        </button>
        <button
          className="btn btn-ghost"
          disabled={pending}
          onClick={() => run('Canceled', 'Cancel this shop? It goes read-only. (Also cancel in Stripe if it has a live subscription.)', () => cancelShop(shopId))}
        >
          Cancel
        </button>
        <button
          className="btn btn-ghost"
          disabled={pending}
          onClick={() =>
            run(
              isEnterprise ? 'Enterprise off' : 'Enterprise on',
              isEnterprise
                ? 'Turn OFF enterprise/manual management for this shop?'
                : 'Mark this shop as enterprise (active + manually managed)?',
              () => setEnterprise(shopId, !isEnterprise),
            )
          }
        >
          {isEnterprise ? 'Enterprise: ON' : 'Enterprise: off'}
        </button>
        {msg && <span style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: 14 }}>{msg}</span>}
      </div>
    </div>
  );
}
