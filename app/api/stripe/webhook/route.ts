import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  planFromPriceId,
  isPaidPlan,
  isInterval,
  type PaidPlan,
  type BillingInterval,
} from '@/lib/stripe/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/stripe/webhook — Stripe -> us. Verifies the signature, then mirrors subscription
// state into shop_entitlements via a SECURITY DEFINER RPC (the webhook has no user session,
// so it uses the service-role client). Handlers set ABSOLUTE state, so Stripe retries are
// idempotent: replaying an event lands the row in the same place.
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    // Not configured yet (keys absent). Nothing to verify against; signal misconfiguration.
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature.';
    return NextResponse.json({ error: `Signature verification failed: ${message}` }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    // Can't write without the service-role key. Return 500 so Stripe retries once configured.
    return NextResponse.json({ error: 'Server not configured to record billing.' }, { status: 500 });
  }

  // The event's creation time orders writes: the RPC ignores an event older than the last one
  // it applied, so a delayed Stripe retry can't overwrite newer state (e.g. resurrect a
  // canceled subscription). Stripe does not guarantee delivery order — this makes us safe.
  const eventAt = new Date(event.created * 1000).toISOString();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const shopIdHint =
          session.client_reference_id ??
          (session.metadata?.shop_id as string | undefined) ??
          null;
        const subId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(admin, sub, shopIdHint, eventAt);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const shopIdHint = (sub.metadata?.shop_id as string | undefined) ?? null;
        await syncSubscription(admin, sub, shopIdHint, eventAt);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoiceSubscriptionId(invoice);
        const customerId = idOf(invoice.customer);
        // Mark past_due without touching plan/limits. Located by subscription or customer id.
        if (subId || customerId) {
          // Comped/enterprise shops are operator-managed — never let Stripe flip them.
          if (await isManuallyManaged(admin, { subId, customerId, shopId: null })) break;
          const { error } = await admin.rpc('apply_stripe_subscription', {
            _shop_id: null,
            _stripe_customer_id: customerId,
            _stripe_subscription_id: subId,
            _stripe_price_id: null,
            _plan: null,
            _subscription_status: 'past_due',
            _billing_interval: null,
            _current_period_end: null,
            _event_at: eventAt,
          });
          if (error) throw new Error(error.message);
        }
        break;
      }

      default:
        // Unhandled event type — acknowledge so Stripe doesn't retry.
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook handler error.';
    // 500 => Stripe retries (transient DB error, etc.). Idempotent handlers make this safe.
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// Non-null import type only — the admin client is a supabase-js client.
type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

// Push a subscription's current state into shop_entitlements via the RPC.
async function syncSubscription(
  admin: Admin,
  sub: Stripe.Subscription,
  shopIdHint: string | null,
  eventAt: string,
) {
  const item = sub.items?.data?.[0];
  const priceId = item?.price?.id ?? null;
  const { plan, interval } = resolvePlan(sub, priceId);

  // Comped/enterprise shops (managed_manually) are controlled from /ops — a Stripe event must
  // not overwrite the operator-set plan/status. Skip the write for them.
  if (await isManuallyManaged(admin, { subId: sub.id, customerId: idOf(sub.customer), shopId: shopIdHint })) {
    return;
  }

  const { error } = await admin.rpc('apply_stripe_subscription', {
    _shop_id: shopIdHint,
    _stripe_customer_id: idOf(sub.customer),
    _stripe_subscription_id: sub.id,
    _stripe_price_id: priceId,
    _plan: plan,
    _subscription_status: mapStatus(sub.status),
    _billing_interval: interval,
    _current_period_end: periodEndISO(sub),
    _event_at: eventAt,
  });
  if (error) throw new Error(error.message);
}

// Which plan/interval a subscription is on: prefer the configured price map, fall back to
// the metadata we stamped at checkout, then to the price's own recurring interval.
function resolvePlan(
  sub: Stripe.Subscription,
  priceId: string | null,
): { plan: PaidPlan | null; interval: BillingInterval } {
  const fromPrice = planFromPriceId(priceId);
  if (fromPrice) return fromPrice;

  const metaPlan = sub.metadata?.plan;
  const plan: PaidPlan | null = isPaidPlan(metaPlan) ? metaPlan : null;

  const recurring = sub.items?.data?.[0]?.price?.recurring?.interval;
  const metaInterval = sub.metadata?.interval;
  const interval: BillingInterval =
    recurring === 'year'
      ? 'year'
      : recurring === 'month'
        ? 'month'
        : isInterval(metaInterval)
          ? metaInterval
          : 'month';
  return { plan, interval };
}

// Map Stripe's subscription status to our shop_entitlements enum.
function mapStatus(s: Stripe.Subscription.Status): string {
  switch (s) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
    case 'paused':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'canceled';
    default:
      // 'incomplete' and any future statuses: not an active subscription yet.
      return 'none';
  }
}

// current_period_end moved onto subscription items in newer API versions; read either shape
// without tripping the type checker across SDK versions.
function periodEndISO(sub: Stripe.Subscription): string | null {
  const fromItem = (sub.items?.data?.[0] as { current_period_end?: number } | undefined)
    ?.current_period_end;
  const fromTop = (sub as unknown as { current_period_end?: number }).current_period_end;
  const epoch = typeof fromItem === 'number' ? fromItem : fromTop;
  return typeof epoch === 'number' ? new Date(epoch * 1000).toISOString() : null;
}

// invoice.subscription is deprecated in newer API versions (moved under parent). Read both.
function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const direct = (invoice as unknown as { subscription?: string | { id: string } | null })
    .subscription;
  if (typeof direct === 'string') return direct;
  if (direct && typeof direct === 'object') return direct.id;
  const parent = (
    invoice as unknown as {
      parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null;
    }
  ).parent;
  const nested = parent?.subscription_details?.subscription;
  if (typeof nested === 'string') return nested;
  if (nested && typeof nested === 'object') return nested.id;
  return null;
}

// Normalize a Stripe id-or-object field to its string id.
function idOf(v: string | { id: string } | null | undefined): string | null {
  if (!v) return null;
  return typeof v === 'string' ? v : v.id;
}

// True if the target shop is operator-managed (comped/enterprise, managed_manually=true), in
// which case Stripe events must NOT overwrite its plan/status. Resolves the shop the SAME way
// apply_stripe_subscription does — subscription id, then customer id, then checkout shop id —
// using the service-role client (RLS-bypassing, no user session in a webhook).
async function isManuallyManaged(
  admin: Admin,
  ids: { subId?: string | null; customerId?: string | null; shopId?: string | null },
): Promise<boolean> {
  // 'managed' | 'not' | 'unknown' (no value, no match, or a query error). Uses a plain array
  // read (NOT maybeSingle, which ERRORS if a customer maps to >1 shop — Max multi-shop) and
  // treats ANY matching managed row as managed. On error we return 'unknown' and fall through;
  // if all paths are unknown the result is false (fail-open) — acceptable because comped shops
  // rarely have live Stripe events and Stripe retries transient failures.
  const lookup = async (
    column: string,
    value: string | null | undefined,
  ): Promise<'managed' | 'not' | 'unknown'> => {
    if (!value) return 'unknown';
    const { data, error } = await admin.from('shop_entitlements').select('managed_manually').eq(column, value);
    if (error || !data || data.length === 0) return 'unknown';
    return data.some((r) => r.managed_manually === true) ? 'managed' : 'not';
  };
  let result = await lookup('stripe_subscription_id', ids.subId);
  if (result === 'unknown') result = await lookup('stripe_customer_id', ids.customerId);
  if (result === 'unknown') result = await lookup('shop_id', ids.shopId);
  return result === 'managed';
}
