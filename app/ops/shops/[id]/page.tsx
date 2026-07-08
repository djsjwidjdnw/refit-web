import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ShopActions } from '../../shop-actions';
import type { OpsShopDetail } from '../../types';
import { fmtUsd, fmtDate } from '../../types';

export const dynamic = 'force-dynamic';

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="kv">
      <span className="k">{k}</span>
      <span className="v">{v ?? '—'}</span>
    </div>
  );
}

// Read-only drill-in. All data from the operator-gated ops_get_shop() RPC. No impersonation.
export default async function OpsShopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('ops_get_shop', { _shop_id: id });

  if (error || !data) {
    return (
      <div className="error" style={{ marginTop: 16 }}>
        Could not load this shop (or your account isn’t authorized at the database layer).
      </div>
    );
  }

  const detail = data as OpsShopDetail;
  const shop = detail.shop;
  const ent = (detail.entitlement ?? {}) as Record<string, any>;
  const members = detail.members ?? [];
  const joinRequests = detail.join_requests ?? [];
  const customerId = (ent.stripe_customer_id as string | null) ?? null;
  const isEnterprise = ent.plan === 'enterprise';

  return (
    <>
      <p className="note" style={{ marginTop: 8 }}>
        <Link href="/ops" style={{ color: 'var(--accent)' }}>
          ← All shops
        </Link>
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, margin: '4px 0' }}>{shop?.name ?? 'Shop'}</h1>
        {ent.managed_manually && <span className="pill pill-accent">manually managed</span>}
        <span className="pill">{(ent.subscription_status as string) ?? 'none'}</span>
      </div>

      <ShopActions shopId={id} isEnterprise={isEnterprise} />

      <div style={{ display: 'grid', gap: 16, marginTop: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div className="card">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Entitlement</div>
          <Row k="Plan" v={<span style={{ textTransform: 'capitalize' }}>{(ent.plan as string) ?? 'none'}</span>} />
          <Row k="Status" v={(ent.subscription_status as string) ?? 'none'} />
          <Row k="Interval" v={(ent.billing_interval as string) ?? '—'} />
          <Row k="MRR" v={fmtUsd(detail.mrr)} />
          <Row k="Seats (incl / add-on)" v={`${ent.seats_included ?? 0} / ${ent.add_on_seats ?? 0}`} />
          <Row k="Active job limit" v={ent.active_job_limit ?? '∞'} />
          <Row k="Trial ends" v={fmtDate(ent.trial_ends_at)} />
          <Row k="Period end" v={fmtDate(ent.current_period_end)} />
          <Row k="Grace started" v={fmtDate(ent.grace_started_at)} />
          <Row k="Created" v={fmtDate(shop?.created_at)} />
        </div>

        <div className="card">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Stripe (read-only)</div>
          <Row
            k="Customer"
            v={
              customerId ? (
                <a
                  href={`https://dashboard.stripe.com/customers/${customerId}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--accent)' }}
                >
                  {customerId} ↗
                </a>
              ) : (
                '—'
              )
            }
          />
          <Row k="Subscription" v={(ent.stripe_subscription_id as string) ?? '—'} />
          <Row k="Price" v={(ent.stripe_price_id as string) ?? '—'} />
          <Row k="Join code" v={shop?.join_code ?? '—'} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Members ({members.length})</div>
        {members.length === 0 ? (
          <p className="note" style={{ margin: 0 }}>No members.</p>
        ) : (
          members.map((m) => (
            <div key={m.user_id} className="kv">
              <span className="k">{m.display_name || m.email || m.user_id}</span>
              <span className="v">
                <span className="pill">{m.role}</span>{' '}
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{m.email}</span>
              </span>
            </div>
          ))
        )}
      </div>

      {joinRequests.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Pending join requests ({joinRequests.length})</div>
          {joinRequests.map((r) => (
            <div key={r.user_id} className="kv">
              <span className="k">{r.email ?? r.user_id}</span>
              <span className="v" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                {fmtDate(r.requested_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
