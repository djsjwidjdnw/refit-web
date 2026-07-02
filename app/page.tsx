import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Tier = {
  plan: string;
  display_name: string;
  price_usd_monthly: number | null;
  seats_included: number | null;
  sort_order: number;
};

// Locked pricing, used if billing_plans can't be read yet (migration 0027 not applied, or
// its RLS only grants SELECT to `authenticated` so an anon visitor gets nothing). The page
// still renders the real tiers; once the table is readable by anon these come from the DB.
const FALLBACK_TIERS: Tier[] = [
  { plan: 'lite', display_name: 'Lite', price_usd_monthly: 99, seats_included: 5, sort_order: 1 },
  { plan: 'pro', display_name: 'Pro', price_usd_monthly: 179, seats_included: 10, sort_order: 2 },
  { plan: 'max', display_name: 'Max', price_usd_monthly: 299, seats_included: 20, sort_order: 3 },
  { plan: 'enterprise', display_name: 'Enterprise', price_usd_monthly: null, seats_included: null, sort_order: 4 },
];

async function getTiers(): Promise<Tier[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('billing_plans')
      .select('plan, display_name, price_usd_monthly, seats_included, sort_order')
      .order('sort_order');
    if (data && data.length) return data as Tier[];
  } catch {
    // table not present yet / RLS blocked — fall through to the locked pricing
  }
  return FALLBACK_TIERS;
}

export default async function Home() {
  const tiers = await getTiers();

  return (
    <>
      <header className="container">
        <nav className="nav">
          <div className="brand">
            Re<span>Fit</span>
          </div>
          <div className="row">
            <Link href="/login" className="btn btn-ghost">
              Sign in
            </Link>
            <Link href="/signup" className="btn btn-primary">
              Start free trial
            </Link>
          </div>
        </nav>
      </header>

      <main className="container">
        <section className="hero">
          <h1>Put it back together without guessing.</h1>
          <p>
            ReFit photographs and voice-notes every part of a teardown — bagged, labelled,
            and searchable — so reassembly is exact. Run your shop, your techs, and your
            plan from one place.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link href="/signup" className="btn btn-primary">
              Start 14-day free trial
            </Link>
            <Link href="/login" className="btn btn-ghost">
              Sign in
            </Link>
          </div>
        </section>

        <div className="section-label">Plans</div>
        <div className="pricing">
          {tiers.map((t) => (
            <div key={t.plan} className="card tier">
              <div className="tier-name">{t.display_name}</div>
              <div className="tier-price">
                {t.price_usd_monthly != null ? (
                  <>
                    ${t.price_usd_monthly}
                    <small>/mo</small>
                  </>
                ) : (
                  'Custom'
                )}
              </div>
              <div className="tier-seats">
                {t.seats_included != null ? `${t.seats_included} techs included` : 'Custom seats'}
              </div>
              <div style={{ marginTop: 18 }}>
                <Link href="/signup" className="btn btn-ghost btn-block">
                  {t.plan === 'enterprise' ? 'Contact us' : 'Start trial'}
                </Link>
              </div>
            </div>
          ))}
        </div>
        <p className="note">
          14-day trial (card required). Annual billing is 2 months free. Add-on seats $15/tech.
          Owner/admin seat is free.
        </p>

        <div className="section-label">Why ReFit</div>
        <ul className="feature-list">
          <li>
            <b>Bag &amp; label every part</b> — QR or auto-numbered, with photos and a voice
            note per bag.
          </li>
          <li>
            <b>Fastener totals</b> — know exactly what to re-order for a rebuild.
          </li>
          <li>
            <b>Roles &amp; per-boat access</b> — admins, team leads, techs, and parts, assigned
            to the jobs they work.
          </li>
          <li>
            <b>Works offline</b> — capture on flaky yard wifi; it syncs when you're back.
          </li>
        </ul>
      </main>

      <footer className="footer">
        <div className="container">© {new Date().getFullYear()} ReFit · refit-iq.com</div>
      </footer>
    </>
  );
}
