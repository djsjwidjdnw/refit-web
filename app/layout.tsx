import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://refit-iq.com'),
  // The tab title, the social preview and the H1 must tell ONE story: 109 of 122
  // visitors arrive from Facebook or Instagram, so essentially every visitor sees
  // the preview card and the page back to back inside a second. A mismatch there
  // is a bounce that looks identical to an ordinary exit in analytics.
  // These strings, app/opengraph-image.png (regenerate via scripts/make-og-image.mjs)
  // and the H1 in app/page.tsx are four copies of the same promise — change one,
  // change all four.
  // No dashes in either string. Both used to open "ReFitIQ — you pay for…", and an
  // em-dash in the tab title and the social card is the first thing a reader who has
  // decided the site was machine-written sees.
  title: 'ReFitIQ. You pay for that teardown twice.',
  description:
    'An iPhone app for boatyard owners. Your techs tag every part as it comes off, so anyone free can put it back. Built at Philbrook’s Boatyard in Sidney, BC. 14 days free, no card.',
  openGraph: {
    title: 'ReFitIQ. You pay for that teardown twice.',
    description:
      'An iPhone app for boatyard owners. Your techs tag every part as it comes off, so anyone free can put it back. Built at Philbrook’s Boatyard in Sidney, BC. 14 days free, no card.',
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
      </body>
    </html>
  );
}
