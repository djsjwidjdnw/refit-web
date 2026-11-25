import type { Metadata } from 'next';
import Image from 'next/image';
import { STORE_PRODUCTS, formatCad } from '@/lib/store';
import { SUPPORT_EMAIL } from '@/lib/site-content';

// Buy QR stickers (Jon 19-21 Nov #12). The product list is lib/store.ts; checkout is a Stripe
// Payment Link (quantity, shipping address in Canada or the US, phone), so this page only shows
// the product and sends the buyer there. Copy follows the house style in app/(site)/page.tsx.
export const metadata: Metadata = {
  title: 'Buy QR stickers | ReFitIQ',
  description:
    'ReFitIQ QR stickers, a roll of 100 for $35 CAD. The stickers the app scans to open a part file. Ships to Canada and the US.',
  alternates: { canonical: '/stickers' },
};

export default function Stickers() {
  const products = STORE_PRODUCTS.filter((p) => p.section === 'stickers');
  return (
    <>
      <section className="container page-hero">
        <div className="eyebrow">Stickers</div>
        <h1>QR stickers for your parts</h1>
        <p className="lede">
          One on each part as it comes off. Scan it later and the part file opens, with its photos and fasteners.
        </p>
      </section>

      {products.map((p) => (
        <section key={p.slug} className="container page-section store-product">
          <div className="store-photo">
            <Image src={p.image} alt={p.imageAlt} width={1600} height={1000} sizes="(max-width: 900px) 100vw, 560px" priority />
          </div>
          <div className="store-copy">
            <h2>{p.name}</h2>
            <p className="store-price">
              {formatCad(p.priceCad)} <span className="store-unit">{p.unit.toLowerCase()}</span>
            </p>
            <p>{p.summary}</p>
            <ul className="store-details">
              {p.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <a className="btn btn-primary btn-block store-buy" href={p.paymentLink} rel="noopener">
              Buy stickers
            </a>
            <p className="store-note">
              Choose how many rolls at checkout, which Stripe runs. Questions about an order:{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </div>
        </section>
      ))}
    </>
  );
}
