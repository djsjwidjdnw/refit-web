import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import {
  isPaidPlan,
  isInterval,
  priceIdFor,
  TRIAL_DAYS,
  type PaidPlan,
  type BillingInterval,
} from '@/lib/stripe/plans';
import { requireShopAdmin, siteOrigin } from '@/lib/billing/access';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/checkout — start a Stripe Checkout Session for { shopId, plan, interval }.
// Authed + admin-gated. 14-day trial, card required. The shop id rides on the session
// (client_reference_id + metadata) AND the subscription (subscription_data.metadata) so the
// webhook can link the entitlement from either a checkout or a bare subscription event.
export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Billing is not configured yet.' }, { status: 503 });
  }

  let body: { shopId?: string; plan?: string; interval?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const shopId = body.shopId;
  const plan = body.plan as PaidPlan;
  const interval: BillingInterval = isInterval(body.interval) ? body.interval : 'month';

  if (!isPaidPlan(plan)) {
    return NextResponse.json(
      { error: 'Choose Lite, Pro, or Max. Enterprise is handled by contacting sales.' },
      { status: 400 },
    );
  }

  const access = await requireShopAdmin(shopId ?? '');
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const priceId = priceIdFor(plan, interval);
  if (!priceId) {
    return NextResponse.json(
      { error: `Billing isn't configured for the ${plan} plan yet.` },
      { status: 503 },
    );
  }

  // Read the shop's entitlement (RLS lets the admin read their own shop's row) to (a) block a
  // double-subscription and (b) reuse an existing Stripe customer.
  const supabase = await createClient();
  const { data: ent } = await supabase
    .from('shop_entitlements')
    .select('stripe_customer_id, stripe_subscription_id')
    .eq('shop_id', shopId!)
    .maybeSingle();

  // Already subscribed → don't mint a second subscription (server-side guard; the dashboard
  // also hides plan buttons, but the endpoint is directly callable). Changing plans goes
  // through the billing portal. Guard on the subscription id, not status, so a fresh
  // trialing shop (plan 'none', no subscription yet) can still check out.
  if (ent?.stripe_subscription_id) {
    return NextResponse.json(
      { error: 'This shop already has a subscription — use Manage billing to change plans.' },
      { status: 409 },
    );
  }
  const existingCustomer = (ent?.stripe_customer_id as string | null) ?? null;

  const origin = siteOrigin(request);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      // Card required even during the trial.
      payment_method_collection: 'always',
      client_reference_id: shopId!,
      metadata: { shop_id: shopId!, plan, interval },
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: { shop_id: shopId!, plan, interval },
      },
      allow_promotion_codes: true,
      // Reuse the customer if known; otherwise seed the new customer with the admin's email.
      ...(existingCustomer
        ? { customer: existingCustomer }
        : access.userEmail
          ? { customer_email: access.userEmail }
          : {}),
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard?checkout=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Could not start checkout.' }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
