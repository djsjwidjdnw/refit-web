import Link from 'next/link';
import Image from 'next/image';
import { createPublicClient } from '@/lib/supabase/public';
import RoiCalculator from './roi-calculator';
import { CtaLink } from './cta-link';
import { StickyCta } from './sticky-cta';

// ISR rather than force-dynamic. The page renders nothing user-specific, so making every
// ad click wait on a cookie read plus a Supabase round trip before first byte bought
// nothing. Pricing is still read from billing_plans — just at most once per window, off
// the request path.
export const revalidate = 300;

type Tier = {
  plan: string;
  display_name: string;
  price_usd_monthly: number | null;
  seats_included: number | null;
  sort_order: number;
};

// Locked pricing, used when billing_plans can't be read. This is the ACTIVE path today:
// the table's RLS grants SELECT to `authenticated` only, so an anonymous visitor — i.e.
// every ad click — gets zero rows and renders these. They match the live prices. Grant
// anon SELECT on billing_plans and the values below start coming from the DB instead,
// picked up within the revalidate window.
const FALLBACK_TIERS: Tier[] = [
  { plan: 'lite', display_name: 'Lite', price_usd_monthly: 99, seats_included: 5, sort_order: 1 },
  { plan: 'pro', display_name: 'Pro', price_usd_monthly: 179, seats_included: 10, sort_order: 2 },
  { plan: 'max', display_name: 'Max', price_usd_monthly: 299, seats_included: 20, sort_order: 3 },
  { plan: 'enterprise', display_name: 'Enterprise', price_usd_monthly: null, seats_included: null, sort_order: 4 },
];

async function getTiers(): Promise<Tier[]> {
  try {
    const supabase = createPublicClient();
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

// Every image below is a real screen from the shipping iOS app, cropped out of the App
// Store assets. Nothing here is a mockup.
const SHOT_W = 860;
const SHOT_H = 1713;

const STEPS = [
  {
    n: '01',
    title: 'Capture as you tear down',
    body:
      'Photograph the part while it is still in your hand, bag it, and label the bag with a scanned QR or an auto-generated number. No writing it up later from memory.',
    src: '/shots/capture-identify.webp',
    alt: 'The ReFit capture screen, choosing how to identify a bag: scan a QR code, auto-number it, or enter a label.',
  },
  {
    n: '02',
    title: 'Organised by boat, area and component',
    body:
      'Every capture lands under the right boat, area and component — so six months later the record reads like the vessel, not like a camera roll.',
    src: '/shots/job-overview.webp',
    alt: 'A ReFit job overview for the vessel Castaway showing capture counts and flagged items by area.',
  },
  {
    n: '03',
    title: 'Reassemble from the record',
    body:
      'Each part carries its own stage, notes and photos from removal through to reinstall, so the tech doing the rebuild can see what the tech who pulled it saw.',
    src: '/shots/part-lifecycle.webp',
    alt: 'A ReFit part detail screen showing its lifecycle stage and technician notes.',
  },
  {
    n: '04',
    title: 'Export the whole job',
    body:
      'Hand the owner, the surveyor or your own files a complete record — Excel, CSV, JSON or PDF, with the photos attached.',
    src: '/shots/export.webp',
    alt: 'The ReFit export screen offering Excel, CSV, JSON and PDF formats.',
  },
];

const FAQ = [
  {
    q: 'Does it work where there is no signal?',
    a: 'Yes. Capture runs offline and syncs when the device is back on a connection, which is the normal case in a shed or below decks.',
  },
  {
    q: 'Do we have to buy QR labels?',
    a: 'No. You can scan a QR or barcode if you already use them, or let ReFit auto-number each bag. Both work the same way afterwards.',
  },
  {
    q: 'Can I control who sees which boat?',
    a: 'Yes. Admins, team leads, techs and parts staff are separate roles, and techs and team leads only see the boats they are assigned to.',
  },
  {
    q: 'What happens to the record if we stop paying?',
    a: 'Nothing is deleted. The shop goes read-only — you can still open and export every job — and you can export the full record, photos included, at any time. The export is a plain file you keep, not a format that needs ReFit to open.',
  },
  {
    q: 'How long before a crew is actually using it?',
    a: 'It is a phone app with a camera and a job list. The first capture takes about a minute; there is no implementation project.',
  },
  {
    q: 'When do you actually charge us?',
    a: 'We collect a card at signup, but nothing is charged during the 14 days. Cancel before it ends and you pay nothing.',
  },
  {
    q: 'What does the trial cost?',
    a: 'Nothing for 14 days — full access, every feature. You pick a plan when the trial ends, and you can cancel at any point before then without being charged.',
  },
];

function Shot({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div className="shot">
      {/* .shot is max-width:300px at every breakpoint, so the slot is a flat 300px —
          describing it as 78vw made Next pick larger candidates than can ever render. */}
      <Image src={src} alt={alt} width={SHOT_W} height={SHOT_H} priority={priority} sizes="300px" />
    </div>
  );
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
            <CtaLink src="nav">Start free trial</CtaLink>
          </div>
        </nav>
      </header>

      <main>
        {/* ── HERO ─────────────────────────────────────────────────────────────── */}
        <section className="container hero-split">
          <div className="hero-copy">
            <div className="eyebrow">For refit and boatyard crews</div>
            <h1>Put it back together without guessing.</h1>
            <p>
              ReFit photographs, bags and labels every part as it comes off the boat — searchable
              by boat, area and component — so the rebuild is exact and the record is done before
              anyone walks off the job.
            </p>
            <div className="row hero-cta">
              <CtaLink src="hero">Start your 14-day free trial</CtaLink>
              <Link href="#how" className="btn btn-ghost">
                See how it works
              </Link>
            </div>
            <div className="hero-trust">
              <span>14 days free</span>
              <span>Every feature</span>
              <span>Cancel anytime</span>
            </div>
            <div className="hero-meta">
              iPhone · works offline · export anytime
            </div>
          </div>
          <div className="hero-shot">
            <Shot
              src="/shots/fastener-photo.webp"
              alt="A ReFit capture in progress: a gloved hand holding hardware photographed against the workbench, filed under bag 444."
              priority
            />
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
        <section id="how" className="container">
          <div className="section-label">How it works</div>
          <h2 className="section-head">Four steps, done at the bench</h2>
          <div className="steps">
            {STEPS.map((s) => (
              <article key={s.n} className="step">
                <div className="step-copy">
                  <div className="step-n">{s.n}</div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
                <Shot src={s.src} alt={s.alt} />
              </article>
            ))}
          </div>
          <div className="mid-cta" data-sticky-stop>
            <CtaLink src="after-how">Start your 14-day free trial</CtaLink>
            <span className="mid-cta-note">Cancel anytime, no charge</span>
          </div>
        </section>

        {/* ── THE NUMBERS ──────────────────────────────────────────────────────── */}
        <section className="container">
          <div className="section-label">The numbers</div>
          <h2 className="section-head">What the hunting actually costs you</h2>
          <p className="section-sub">
            The expensive part of a refit is not the documentation — it is a tech standing in
            front of an open bulkhead trying to remember which bolt went where. Twenty minutes a
            day, per tech, is a conservative floor.
          </p>

          <div className="numbers">
            <div className="card num">
              <div className="num-v">$104,000</div>
              <div className="num-k">Labour recovered / year</div>
              <div className="num-d">10 techs × 20 min/day × 240 days × $130/hr</div>
            </div>
            <div className="card num">
              <div className="num-v">~$6,000</div>
              <div className="num-k">Duplicate orders avoided</div>
              <div className="num-d">Fastener counts come off the record, not a guess</div>
            </div>
            <div className="card num">
              <div className="num-v">~$20,000</div>
              <div className="num-k">Faster turnaround</div>
              <div className="num-d">Slips free up sooner when reassembly stops stalling</div>
            </div>
          </div>

          <div className="bottomline card">
            <div>
              <div className="bl-k">Conservative floor</div>
              <div className="bl-v">$130,000+ / year</div>
            </div>
            <div className="bl-x">against</div>
            <div>
              <div className="bl-k">ReFit, 10 techs</div>
              <div className="bl-v">$2,148 / year</div>
            </div>
          </div>

          <h3 className="mini-head">Run your own numbers</h3>
          <RoiCalculator />
          <div className="mid-cta" data-sticky-stop>
            <CtaLink src="after-roi">Start your 14-day free trial</CtaLink>
            <span className="mid-cta-note">Cancel anytime, no charge</span>
          </div>
        </section>

        {/* ── WHO IT'S FOR / TRUST ─────────────────────────────────────────────── */}
        <section className="container">
          <div className="section-label">Who it&apos;s for</div>
          <h2 className="section-head">Built on a working shop floor</h2>
          <p className="section-sub">
            ReFit was built alongside Philbrooks Boatyard in British Columbia — on real refits,
            with the techs doing the work. Every screen on this page is the shipping app, not a
            mockup.
          </p>
          <ul className="feature-list trust-list">
            <li>
              <b>Refit and repower yards</b> — teardowns that run for months and change hands
              between techs.
            </li>
            <li>
              <b>Service departments</b> — where the same boat comes back next season and nobody
              remembers the last job.
            </li>
            <li>
              <b>Owners and surveyors</b> — who need a record of what was actually done, with
              photos.
            </li>
            <li>
              <b>Roles &amp; per-boat access</b> — admins, team leads, techs and parts staff, each
              assigned to the jobs they work.
            </li>
          </ul>
        </section>

        {/* ── PRICING ──────────────────────────────────────────────────────────── */}
        <section className="container">
          <div className="section-label">Plans</div>
          <h2 className="section-head">Priced per shop, not per photo</h2>
          <div className="pricing">
            {tiers.map((t) => (
              <div key={t.plan} className={`card tier${t.plan === 'pro' ? ' tier-featured' : ''}`}>
                {t.plan === 'pro' && <div className="tier-flag">Most shops</div>}
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
                  {t.plan === 'enterprise' ? (
                    // "Contact us" used to land on the signup form, which is not what it
                    // says it does. Enterprise is a conversation, so send them to one.
                    <a
                      className="btn btn-ghost btn-block"
                      href="mailto:support@refit-iq.com?subject=ReFit%20Enterprise%20enquiry"
                    >
                      Contact us
                    </a>
                  ) : (
                    <CtaLink
                      src={`pricing-${t.plan}`}
                      className={`btn btn-block ${t.plan === 'pro' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                      Start trial
                    </CtaLink>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="note">
            14-day free trial — cancel anytime, no charge. Annual billing is 2 months free. Add-on
            seats $15/tech. Owner/admin seat is free.
          </p>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
        <section className="container">
          <div className="section-label">Questions</div>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q} className="faq-item">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── CLOSING CTA ──────────────────────────────────────────────────────── */}
        <section className="container">
          <div className="closer card" data-sticky-stop>
            <h2>Start on your next teardown.</h2>
            <p>Fourteen days free. Cancel before the trial ends and you pay nothing.</p>
            <div className="row hero-cta">
              <CtaLink src="closer">Start your 14-day free trial</CtaLink>
              <Link href="/login" className="btn btn-ghost">
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <StickyCta />

      <footer className="footer">
        <div className="container">
          <div className="footer-links">
            <Link href="/getting-started">Getting started</Link>
            <Link href="/login">Sign in</Link>
            <Link href="/signup?src=footer">Start free trial</Link>
            <a href="mailto:support@refit-iq.com">support@refit-iq.com</a>
          </div>
          <div>© {new Date().getFullYear()} ReFit · refit-iq.com</div>
        </div>
      </footer>
    </>
  );
}
