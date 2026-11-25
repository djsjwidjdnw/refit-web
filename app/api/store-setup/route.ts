import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { stripe } from '@/lib/stripe/server';

// TEMPORARY (Jon 19-21 Nov #12, 25 Nov 2026): makes the QR sticker product, its $35.00 CAD price
// and its Payment Link in the live Stripe account this site already uses. The site's Stripe key
// is write-only in Vercel, so the one place that can use it is the site itself. Called once with
// STORE_SETUP_TOKEN (a one-off Vercel env var), then this file and the variable are removed.
// Idempotent: finds the product and link by metadata refit_sku before creating anything.

export const dynamic = 'force-dynamic';
const SKU = 'qr-stickers-100';

function authorised(req: Request): boolean {
  const want = process.env.STORE_SETUP_TOKEN ?? '';
  const got = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (want.length < 32 || got.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export async function POST(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!stripe) return NextResponse.json({ error: 'stripe not configured' }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { image?: string };
  const image = typeof body.image === 'string' && body.image.startsWith('https://refit-iq.com/') ? body.image : null;

  const acct = await stripe.accounts.retrieveCurrent();
  const products = await stripe.products.list({ active: true, limit: 100 });
  let product = products.data.find((p) => p.metadata?.refit_sku === SKU);
  if (!product) {
    product = await stripe.products.create({
      name: 'ReFitIQ QR stickers, roll of 100',
      description:
        'A roll of 100 ReFitIQ QR stickers, 25.4 x 12.7 mm, each with the ReFitIQ logo, a QR code and a 6 character code. Ships to Canada and the US.',
      shippable: true,
      metadata: { refit_sku: SKU, section: 'stickers' },
      default_price_data: { currency: 'cad', unit_amount: 3500 },
      ...(image ? { images: [image] } : {}),
    });
  } else if (image && !(product.images ?? []).includes(image)) {
    product = await stripe.products.update(product.id, { images: [image] });
  }
  const priceId = typeof product.default_price === 'string' ? product.default_price : product.default_price?.id;
  if (!priceId) return NextResponse.json({ error: 'product has no default price' }, { status: 500 });
  const price = await stripe.prices.retrieve(priceId);
  if (price.unit_amount !== 3500 || price.currency !== 'cad') {
    return NextResponse.json({ error: 'price is not 35.00 CAD', unit_amount: price.unit_amount, currency: price.currency }, { status: 409 });
  }

  const links = await stripe.paymentLinks.list({ active: true, limit: 100 });
  let link = links.data.find((l) => l.metadata?.refit_sku === SKU);
  if (!link) {
    link = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1, adjustable_quantity: { enabled: true, minimum: 1, maximum: 99 } }],
      shipping_address_collection: { allowed_countries: ['CA', 'US'] },
      phone_number_collection: { enabled: true },
      billing_address_collection: 'auto',
      automatic_tax: { enabled: false },
      allow_promotion_codes: false,
      submit_type: 'pay',
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: 'Thanks for your order. Your stickers ship to the address you gave. Questions: support@refit-iq.com',
        },
      },
      metadata: { refit_sku: SKU },
    });
  }
  const items = await stripe.paymentLinks.listLineItems(link.id);
  return NextResponse.json({
    account: { id: acct.id, name: acct.settings?.dashboard?.display_name ?? acct.business_profile?.name ?? null, country: acct.country },
    otherProducts: products.data.filter((p) => p.metadata?.refit_sku !== SKU).map((p) => p.name),
    product: { id: product.id, name: product.name, images: product.images },
    price: { id: price.id, unit_amount: price.unit_amount, currency: price.currency, livemode: price.livemode },
    link: {
      id: link.id,
      url: link.url,
      livemode: link.livemode,
      active: link.active,
      shipping: link.shipping_address_collection?.allowed_countries ?? null,
      phone: link.phone_number_collection?.enabled ?? null,
      automatic_tax: link.automatic_tax?.enabled ?? null,
      shipping_options: link.shipping_options?.length ?? 0,
      line_items: items.data.map((li) => ({ amount: li.price?.unit_amount, currency: li.price?.currency, quantity: li.quantity })),
    },
  });
}
