import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from './sign-out-button';
import { CreateShop } from './create-shop';

export const dynamic = 'force-dynamic';

type MemberRow = { shop_id: string; role: string; shops: any };
type Entitlement = {
  shop_id: string;
  plan: string;
  subscription_status: string;
  seats_included: number;
  seats_used: number;
  add_on_seats: number;
  trial_ends_at: string | null;
};

function shopName(m: MemberRow): string {
  const s = m.shops;
  return (Array.isArray(s) ? s[0]?.name : s?.name) ?? '—';
}
function trialDaysLeft(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
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

  const shopIds = members.map((m) => m.shop_id);
  const entMap = new Map<string, Entitlement>();
  if (shopIds.length) {
    const { data: entData } = await supabase
      .from('shop_entitlements')
      .select(
        'shop_id, plan, subscription_status, seats_included, seats_used, add_on_seats, trial_ends_at',
      )
      .in('shop_id', shopIds);
    for (const e of (entData ?? []) as Entitlement[]) entMap.set(e.shop_id, e);
  }

  const shopNameHint = (user.user_metadata as { shop_name?: string } | null)?.shop_name;

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
        {members.length === 0 ? (
          // Step-4 guard: signed in but no shop yet → create-shop state (not an error).
          <>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: '8px 0 4px' }}>Welcome to ReFit</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: 0 }}>
              You&apos;re signed in — create your shop to start your free trial.
            </p>
            <CreateShop defaultName={shopNameHint} />
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: '8px 0 4px' }}>Your shop</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: 0 }}>
              Read-only for now — plans &amp; billing land in the next step.
            </p>
            <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
              {members.map((m) => {
                const ent = entMap.get(m.shop_id);
                const totalSeats = ent ? ent.seats_included + ent.add_on_seats : null;
                const days = ent ? trialDaysLeft(ent.trial_ends_at) : null;
                const trialing = ent?.subscription_status === 'trialing';
                return (
                  <div key={m.shop_id} className="card">
                    {trialing && (
                      <div className="trial-banner">
                        {days != null && days > 0
                          ? `Trial — ${days} day${days === 1 ? '' : 's'} left`
                          : 'Trial ended — choose a plan to keep going'}
                      </div>
                    )}
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
                      <span className="v">{ent ? `${ent.seats_used} / ${totalSeats}` : '—'}</span>
                    </div>
                    <button
                      className="btn btn-ghost btn-block"
                      disabled
                      style={{ opacity: 0.5, cursor: 'not-allowed', marginTop: 16 }}
                    >
                      Choose a plan (coming soon)
                    </button>
                  </div>
                );
              })}
            </div>
          </>
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
