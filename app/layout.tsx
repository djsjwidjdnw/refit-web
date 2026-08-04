import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://refit-iq.com'),
  // The tab title, the social preview and the H1 were telling three different
  // stories — "teardown & reassembly, documented" in the tab, a paragraph about
  // shop management in the description, and "Put it back together without
  // guessing" on the page. Ad traffic sees the preview and the page back to
  // back, so they now say the same thing, in the page's own words.
  title: 'ReFit — put it back together without guessing',
  description:
    'Photograph every part as it comes off the boat. Rebuild from the record, not memory. Built for refit and boatyard crews.',
  openGraph: {
    title: 'ReFit — put it back together without guessing',
    description:
      'Photograph every part as it comes off the boat. Rebuild from the record, not memory. Built for refit and boatyard crews.',
    url: 'https://refit-iq.com',
    siteName: 'ReFit',
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
