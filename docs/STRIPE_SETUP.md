# Stripe setup — what YOU do to turn billing on

The Stripe code is already built and deployed, but it stays dormant until the keys, prices,
and webhook below are configured. Nothing here has been done for you (it needs your Stripe
login). The app and build run fine with all Stripe env vars blank — billing features simply
no-op until the env is set. Do these steps in **Test mode** first, then repeat in **Live**.

---

## 1) Create the products + prices in Stripe

Stripe Dashboard → **Product catalog → Add product**. Create **three** products, each with a
**monthly** and an **annual** recurring price (USD). Annual = 2 months free (monthly × 10):

| Product        | Monthly price | Annual price      | Notes                    |
| -------------- | ------------- | ----------------- | ------------------------ |
| ReFit Lite     | $99 / month   | $990 / year       | 5 techs included         |
| ReFit Pro      | $179 / month  | $1,790 / year     | 10 techs included        |
| ReFit Max      | $299 / month  | $2,990 / year     | 20 techs, up to 3 shops  |

Optional (reserved for future seat-management UI — not required for launch):

| Product        | Monthly price | Notes                    |
| -------------- | ------------- | ------------------------ |
| Add-on seat    | $15 / month   | per extra tech           |

- **Enterprise** has **no** Stripe product — it's a "Contact us" mailto in the app.
- The 14-day trial and "card required" are set by the app at checkout, **not** on the price —
  don't add a trial to the price itself.
- After saving, copy each **price id** (starts with `price_…`, from the price row, not the
  product id `prod_…`).

## 2) Set the environment variables in Vercel

Vercel → project **refit-web** → **Settings → Environment Variables**. Add each of these
(scope: Production, and Preview if you want billing on preview deploys). Names must match
exactly — the code reads these:

| Env var                              | What goes in it                                             |
| ------------------------------------ | ---------------------------------------------------------- |
| `STRIPE_SECRET_KEY`                  | Stripe secret key (`sk_live_…`, or `sk_test_…` in test)    |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_live_…` / `pk_test_…`)         |
| `STRIPE_WEBHOOK_SECRET`              | Signing secret from the webhook endpoint (step 4, `whsec_…`) |
| `STRIPE_PRICE_LITE_MONTHLY`          | price id for Lite monthly                                   |
| `STRIPE_PRICE_LITE_ANNUAL`           | price id for Lite annual                                    |
| `STRIPE_PRICE_PRO_MONTHLY`           | price id for Pro monthly                                    |
| `STRIPE_PRICE_PRO_ANNUAL`            | price id for Pro annual                                     |
| `STRIPE_PRICE_MAX_MONTHLY`           | price id for Max monthly                                    |
| `STRIPE_PRICE_MAX_ANNUAL`            | price id for Max annual                                     |
| `STRIPE_PRICE_ADDON_SEAT`            | price id for the add-on seat (optional)                    |
| `SUPABASE_SERVICE_ROLE_KEY`          | Supabase **service-role** key (server-only; webhook writes)|
| `NEXT_PUBLIC_SITE_URL`               | `https://refit-iq.com` (optional; used for redirect URLs)  |

Notes:
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Dashboard → Project Settings → API → **service_role**
  secret. This is powerful (bypasses RLS) — only ever a server env var, never `NEXT_PUBLIC_`.
- Redeploy after adding vars (Vercel doesn't apply env changes to an existing deployment).

## 3) Apply the database migration

Run **`supabase/migrations/0029_stripe_apply_subscription.sql`** (in the mobile app repo,
alongside 0027/0028) against the live database. It adds one SECURITY DEFINER RPC,
`apply_stripe_subscription`, that the webhook calls to write `shop_entitlements`. It touches
no existing table, policy, or data. Post-checks are at the bottom of the file. (0027 and 0028
must already be applied — they are.)

## 4) Register the webhook endpoint

Stripe Dashboard → **Developers → Webhooks → Add endpoint**.

- **Endpoint URL:** `https://refit-iq.com/api/stripe/webhook`
  (or your Vercel production URL, e.g. `https://refit-web.vercel.app/api/stripe/webhook`)
- **Events to send:** select
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- After creating it, click **Reveal** on the **Signing secret** (`whsec_…`) and put it in the
  `STRIPE_WEBHOOK_SECRET` env var (step 2), then redeploy.

## 5) Enable the Customer Portal

Stripe Dashboard → **Settings → Billing → Customer portal** → activate it, and allow "cancel
subscription" and "switch plan" if you want admins to self-serve. The app's **Manage billing**
button opens this portal.

---

## Then test (once the above is done)

1. Sign up a fresh shop on refit-iq.com → land on the dashboard (14-day trial).
2. As the shop **admin**, pick a plan (toggle monthly/annual) → you're sent to Stripe Checkout.
   Use test card `4242 4242 4242 4242`, any future expiry / CVC.
3. Complete checkout → back on the dashboard. Within a moment the webhook flips the shop to
   `plan = <chosen>` and `subscription_status = trialing/active`, and the **Manage billing**
   button appears.
4. Click **Manage billing** → the Stripe portal opens; cancelling there should flip the
   dashboard's status to `canceled` (via the `customer.subscription.deleted` webhook).
5. Watch **Developers → Webhooks → your endpoint** for 2xx deliveries. A 400 means the signing
   secret is wrong; a 500/503 means an env var (service-role key) or the 0029 migration is
   missing.

## How it fits together (reference)

- `app/api/checkout/route.ts` — authed + admin-only; creates a Checkout Session (14-day trial,
  card required) for the chosen plan's price id, stamping the shop id on the session and the
  subscription. Redirects to Stripe.
- `app/api/billing-portal/route.ts` — authed + admin-only; opens the Stripe billing portal for
  the shop's existing customer.
- `app/api/stripe/webhook/route.ts` — verifies the Stripe signature, then calls the
  `apply_stripe_subscription` RPC (service-role) to mirror subscription state into
  `shop_entitlements`. Idempotent on Stripe retries.
- `lib/stripe/plans.ts` — plan ⇄ price-id env mapping (never hardcoded) + the display catalog.
- Everything reads secrets from env; nothing is committed.
