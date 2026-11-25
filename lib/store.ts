// The ReFitIQ store (Jon 19-21 Nov #12): physical goods for a shop's parts, sold through Stripe
// Payment Links on the same live Stripe account the subscriptions use. Stripe's hosted checkout
// takes the quantity, a shipping address (Canada or the US) and a phone number; nothing about
// payment is handled on this site.
//
// ONE ENTRY PER PRODUCT. Parts bags and totes go in as more entries: make the product, its CAD
// price and its Payment Link in Stripe (same settings as the stickers), then add it here with its
// photo in public/store/. /stickers renders every entry whose `section` is 'stickers'; a later
// /store page can render them all.
//
// Decided 25 Nov 2026 and still open: no separate shipping charge (the price includes it for
// now), and Stripe Tax is NOT on, so GST/HST is not added at checkout. Whether to charge it is a
// question for Jon.

export type StoreProduct = {
  slug: string;
  section: 'stickers' | 'bags' | 'totes';
  name: string;
  unit: string;
  /** Price per unit in Canadian dollars, as the Stripe price charges it. */
  priceCad: number;
  /** The Stripe Payment Link (live). Quantity is adjustable at checkout. */
  paymentLink: string;
  image: string;
  imageAlt: string;
  summary: string;
  details: string[];
};

export const STORE_PRODUCTS: StoreProduct[] = [
  {
    slug: 'qr-stickers-100',
    section: 'stickers',
    name: 'ReFitIQ QR stickers',
    unit: 'Roll of 100',
    priceCad: 35,
    // Stripe (live, account Refit-iq): product prod_Vh26SN2wb0myiy, price price_1Ufe2D0HWEedbZhUmXkLyrW7
    // ($35.00 CAD), link plink_1Ufe2E0HWEedbZhUkmCvGUai. Made 25 Nov 2026.
    paymentLink: 'https://buy.stripe.com/3cI5kvfKu5oL72627a08g03',
    image: '/store/qr-stickers.png',
    imageAlt: 'A ReFitIQ QR sticker, 25.4 by 12.7 mm, with the ReFitIQ logo, a QR code and the code S1A8E9, above a row of four more',
    summary: 'The stickers the app scans. Put one on each part as it comes off and scan it to open the part file.',
    details: [
      '25.4 x 12.7 mm (1 x 0.5 inch). Every sticker has its own QR code with its 6 character code printed beside it, so it can be typed in when a scan will not read.',
      'Ships to Canada and the US, with shipping included in the price.',
    ],
  },
];

export const formatCad = (n: number) => `$${n.toFixed(2)} CAD`;
