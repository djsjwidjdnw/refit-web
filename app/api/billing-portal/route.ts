import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { requireShopAdmin, siteOrigin } from '@/lib/billing/access';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/billing-portal — open a Stripe billing-portal session so a shop admin can update
// their card, switch/cancel the plan, and see invoices. Authed + admin-gated. Requires the
// shop to already have a Stripe customer (i.e. they've checked out at least once).
export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Billing is not configured yet.' }, { status: 503 });
  }

  let body: { shopId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const shopId = body.shopId;
  const access = await requireShopAdmin(shopId ?? '');
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const supabase = await createClient();
  const { data: ent } = await supabase
    .from('shop_entitlements')
    .select('stripe_customer_id')
    .eq('shop_id', shopId!)
    .maybeSingle();
  const customerId = (ent?.stripe_customer_id as string | null) ?? null;
  if (!customerId) {
    return NextResponse.json(
      { error: 'No billing account yet — choose a plan first.' },
      { status: 400 },
    );
  }

  const origin = siteOrigin(request);
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not open billing portal.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
