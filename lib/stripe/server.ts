import Stripe from 'stripe';

// Server-side Stripe client. The secret key is read from env at module load. If it is
// unset (e.g. during CI/build, or before the operator wires the keys), `stripe` is null and
// every billing feature no-ops gracefully instead of crashing the app or the build.
//
// The API version is intentionally NOT pinned here — the installed stripe-node package
// carries its own pinned default, which keeps this file compiling across SDK upgrades.
const secretKey = process.env.STRIPE_SECRET_KEY;

export const stripe: Stripe | null = secretKey ? new Stripe(secretKey) : null;

// True when the Stripe secret key is configured. Routes use this to return a clean 503
// ("billing not configured") instead of throwing when keys are absent.
export function stripeReady(): boolean {
  return stripe !== null;
}
