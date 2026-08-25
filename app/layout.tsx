import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { MetaPixel } from './meta-pixel';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://refit-iq.com'),
  // The tab title, the social preview and the H1 must tell ONE story: 109 of 122
  // visitors arrive from Facebook or Instagram, so essentially every visitor sees
  // the preview card and the page back to back inside a second. A mismatch there
  // is a bounce that looks identical to an ordinary exit in analytics.
  // These strings, app/opengraph-image.png (regenerate via scripts/make-og-image.mjs)
  // and the H1 in app/page.tsx are four copies of the same promise — change one,
  // change all four. All four moved from "boatyard owners" to "shop owners" when the
  // page opened to automotive, heavy equipment and aviation; the OG png was regenerated,
  // not hand-edited, so its eyebrow tracks scripts/make-og-image.mjs.
  // No dashes in either string. Both used to open "ReFitIQ — you pay for…", and an
  // em-dash in the tab title and the social card is the first thing a reader who has
  // decided the site was machine-written sees.
  //
  // The two descriptions are NOT the same string, and the difference is deliberate.
  // `description` is what Google prints, and it truncates around 160 characters: at 194
  // the Philbrook's credit was cut mid-phrase and "14 days free" fell off the end of the
  // snippet entirely, so the search result carried no offer at all. This one is 163 and
  // the offer survives the cut. openGraph.description is what Facebook and iMessage
  // render, they allow 200-300, and that is where 109 of 122 visitors come from, so it
  // keeps the fuller credit. Measure before lengthening either.
  title: 'ReFitIQ. You pay for that teardown twice.',
  description:
    'An iPhone app for shop owners. Your techs tag every part as it comes off, so whoever puts it back has what he needs. Built at Philbrook’s Boatyard. 14 days free.',
  openGraph: {
    title: 'ReFitIQ. You pay for that teardown twice.',
    description:
      'An iPhone app for shop owners. Your techs tag every part as it comes off, so whoever puts it back has what he needs. Built at Philbrook’s Boatyard in Sidney, BC, with the technicians who use it. 14 days free.',
    url: 'https://refit-iq.com',
    siteName: 'ReFitIQ',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

// Without this the iOS Safari toolbar stays light around a very dark page, which is the
// first thing ad traffic sees. Matches --bg in globals.css.
export const viewport: Viewport = {
  themeColor: '#0e0e10',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Cookieless, no consent banner required. Pageviews work on every Vercel plan;
            the custom funnel events in lib/analytics.ts need Pro. */}
        <Analytics />
        <SpeedInsights />
        {/* NOT cookieless (sets _fbp) — see app/meta-pixel.tsx. */}
        <MetaPixel />
      </body>
    </html>
  );
}
