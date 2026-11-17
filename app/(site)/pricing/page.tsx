import type { Metadata } from 'next';
import RoiCalculator from '../../roi-calculator';
import { CtaLink } from '../../cta-link';
import { ADDON_SEAT_USD, FAQ, SUPPORT_EMAIL, TRIAL_DAYS, getTiers } from '@/lib/site-content';

// Pricing (Jon, 17 Nov 2026): the plans exactly as checkout charges them. Read from
// billing_plans (the table the checkout's Stripe prices mirror; lib/stripe/plans.ts), so this
// page cannot drift from what a shop is billed. Checked on 17 Nov 2026: Lite $99 / 5 techs,
// Pro $179 / 10, Max $299 / 20 and up to 3 shops, add-on seats $15, annual = 2 months free.
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Pricing | ReFitIQ',
  description:
    'One price for the whole shop: Lite $99, Pro $179, Max $299 a month. 14 days free with every feature and every tech. Add-on seats $15.',
  alternates: { canonical: '/pricing' },
};

export default async function Pricing() {
  const tiers = await getTiers();
  const selfServe = tiers.filter((t) => t.plan !== 'enterprise');
  return (
    <>
      <section className="container page-hero">
        <div className="eyebrow">Pricing</div>
        <h1>One price for the whole shop</h1>
        <p className="lede">
          Every plan starts with the same {TRIAL_DAYS} days free, with every feature and every
          tech on your crew. Seats are unlimited until you pick a plan, and you only pay if you
          pick one.
        </p>
      </section>

      <section className="container page-section">
        <div className="plans pricing">
          {selfServe.map((t) => (
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
              <ul className="plan-facts">
                <li>{t.seats_included != null ? `${t.seats_included} techs included` : 'Custom seats'}</li>
                {t.active_job_limit != null ? <li>Up to {t.active_job_limit} active jobs</li> : null}
                <li>{(t.max_shops ?? 1) > 1 ? `Up to ${t.max_shops} shops` : 'One shop'}</li>
                {t.price_usd_monthly != null ? <li>${t.price_usd_monthly * 10} a year, billed annually</li> : null}
              </ul>
              <div style={{ marginTop: 18 }}>
                <CtaLink
                  src={`pricing-${t.plan}`}
                  className={`btn btn-block ${t.plan === 'pro' ? 'btn-primary' : 'btn-ghost'}`}
                >
                  Start your free trial
                </CtaLink>
              </div>
            </div>
          ))}
        </div>
        <p className="note">
          Prices in US dollars. Annual billing is two months free. Add-on seats are $
          {ADDON_SEAT_USD} a tech a month. The owner or admin seat is free and doesn’t use one of
          your paid seats.
        </p>
        <p className="tier-enterprise">
          More than 20 techs, or more than three shops? Email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}?subject=ReFitIQ%20Enterprise%20enquiry`}>{SUPPORT_EMAIL}</a>{' '}
          and we will price it.
        </p>
      </section>

      <section id="roi" className="container page-section s-numbers">
        <h2 className="section-head">The part we can count</h2>
        <p className="section-sub">
          Twenty minutes a tech a day, spent looking for something that came off this job. That
          is the only assumption here. Change it below if it is wrong.
        </p>
        <RoiCalculator />
        <p className="note">
          These are assumptions. We have no measured customer results to show you. The figure is
          labour only.
        </p>
      </section>

      <section id="faq" className="container page-section s-faq">
        <h2 className="section-head">Questions</h2>
        <div className="faq">
          {FAQ.map((f, i) => (
            <details key={f.q} className="faq-item" open={i === 0}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="container page-cta">
        <CtaLink src="pricing-bottom">Start your free trial</CtaLink>
        <span className="mid-cta-note">{TRIAL_DAYS} days, every feature, every tech on your crew.</span>
      </section>
    </>
  );
}
