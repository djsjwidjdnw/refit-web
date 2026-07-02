import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from './sign-out-button';

export const dynamic = 'force-dynamic';

type MemberRow = { shop_id: string; role: string; shops: any };
type Entitlement = {
  shop_id: string;
  plan: string;
  subscription_status: string;
  seats_included: number;
  seats_used: number;
  add_on_seats: number;
};

function shopName(m: MemberRow): string {
  const s = m.shops;
  return (Array.isArray(s) ? s[0]?.name : s?.name) ?? '—';
}

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: membersData } = await supabase
    .from('shop_members')
    .select('shop_id, role, shops(name)')
    .eq('user_id', user.id);
  const members = (membersData ?? []) as MemberRow[];

  // Entitlements may not exist yet (migration 0027 not applied) — degrade gracefully.
  const shopIds = members.map((m) => m.shop_id);
  const entMap = new Map<string, Entitlement>();
  if (shopIds.length) {
    const { data: entData } = await supabase
      .from('shop_entitlements')
      .select('shop_id, plan, subscription_status, seats_included, seats_used, add_on_seats')
      .in('shop_id', shopIds);
    for (const e of (entData ?? []) as Entitlement[]) entMap.set(e.shop_id, e);
  }

  return (
    <>
      <header className="container">
        <div className="dash-header">
          <div className="brand">
            Re<span>Fit</span>
          </div>
          <div className="row">
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="container">
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: '8px 0 4px' }}>Your shops</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 0 }}>
          Read-only for now — billing &amp; shop management land in the next steps.
        </p>

        {members.length === 0 ? (
          <div className="card" style={{ marginTop: 16 }}>
            <p style={{ margin: 0 }}>
              Your account isn&apos;t in a shop yet. If you were invited, ask your shop admin
              to add you — or this is where you&apos;ll create a shop once billing is wired.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
            {members.map((m) => {
              const ent = entMap.get(m.shop_id);
              const totalSeats = ent ? ent.seats_included + ent.add_on_seats : null;
              return (
                <div key={m.shop_id} className="card">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ fontSize: 19, fontWeight: 800 }}>{shopName(m)}</div>
                    <span className="pill pill-accent">{m.role}</span>
                  </div>
                  <div className="kv">
                    <span className="k">Plan</span>
                    <span className="v" style={{ textTransform: 'capitalize' }}>
                      {ent ? ent.plan : 'none'}
                    </span>
                  </div>
                  <div className="kv">
                    <span className="k">Subscription</span>
                    <span className="v">
                      <span className="pill">{ent ? ent.subscription_status : 'not set up'}</span>
                    </span>
                  </div>
                  <div className="kv">
                    <span className="k">Seats used</span>
                    <span className="v">
                      {ent ? `${ent.seats_used} / ${totalSeats}` : '—'}
                    </span>
                  </div>
                  {!ent && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 0 }}>
                      No entitlement record yet — start a plan/trial (coming next).
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="note" style={{ marginTop: 32 }}>
          <Link href="/" style={{ color: 'var(--accent)' }}>
            ← Back to home
          </Link>
        </p>
      </main>
    </>
  );
}
