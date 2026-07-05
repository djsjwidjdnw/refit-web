// Plan ⇄ Stripe price-id mapping and the display catalog for the dashboard picker.
//
// Price IDs are NEVER hardcoded — each (plan, interval) resolves to a Stripe price via an
// env var the operator sets in Vercel later (see docs/STRIPE_SETUP.md). Missing env => the
// route returns "billing not configured" rather than guessing a price.

export const PAID_PLANS = ['lite', 'pro', 'max'] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];
export type BillingInterval = 'month' | 'year';

export function isPaidPlan(v: unknown): v is PaidPlan {
  return typeof v === 'string' && (PAID_PLANS as readonly string[]).includes(v);
}
export function isInterval(v: unknown): v is BillingInterval {
  return v === 'month' || v === 'year';
}

// Env var name holding the Stripe price id for a (plan, interval).
// e.g. ('pro','year') -> 'STRIPE_PRICE_PRO_ANNUAL'
function priceEnvName(plan: PaidPlan, interval: BillingInterval): string {
  const suffix = interval === 'year' ? 'ANNUAL' : 'MONTHLY';
  return `STRIPE_PRICE_${plan.toUpperCase()}_${suffix}`;
}

// Resolve the Stripe price id for a plan+interval from env. null when unset.
export function priceIdFor(plan: PaidPlan, interval: BillingInterval): string | null {
  return process.env[priceEnvName(plan, interval)] ?? null;
}

// Reverse map: a Stripe price id -> which plan/interval it represents, built from the same
// env vars. Used by the webhook to label a subscription when its metadata is unavailable.
// Returns null if the price id isn't one of our configured plan prices.
export function planFromPriceId(
  priceId: string | null | undefined,
): { plan: PaidPlan; interval: BillingInterval } | null {
  if (!priceId) return null;
  for (const plan of PAID_PLANS) {
    for (const interval of ['month', 'year'] as const) {
      if (process.env[priceEnvName(plan, interval)] === priceId) return { plan, interval };
    }
  }
  return null;
}

// Display catalog for the dashboard plan picker. Prices mirror billing_plans (0027) and are
// LOCKED. Annual = 2 months free => annual total = monthly × 10. Enterprise is contact-only.
export const PLAN_CATALOG: {
  plan: PaidPlan;
  name: string;
  monthly: number;
  seats: number;
  blurb: string;
}[] = [
  { plan: 'lite', name: 'Lite', monthly: 99, seats: 5, blurb: 'For a small shop' },
  { plan: 'pro', name: 'Pro', monthly: 179, seats: 10, blurb: 'Most popular' },
  { plan: 'max', name: 'Max', monthly: 299, seats: 20, blurb: 'Up to 3 shops' },
];

// Annual total for a monthly price (2 months free).
export function annualTotal(monthly: number): number {
  return monthly * 10;
}

export const ADDON_SEAT_PRICE_USD = 15;
export const TRIAL_DAYS = 14;
export const ENTERPRISE_CONTACT_EMAIL = 'sales@refit-iq.com';
