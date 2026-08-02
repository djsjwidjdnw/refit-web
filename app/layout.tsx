import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://refit-iq.com'),
  title: 'ReFit — teardown & reassembly, documented',
  description:
    'Photograph and voice-note every part of a teardown so it goes back together right. Sign up, manage your shop, and choose a plan.',
  openGraph: {
    title: 'ReFit — put it back together without guessing',
    description:
      'ReFit photographs, bags and labels every part as it comes off the boat — searchable by boat, area and component, so the rebuild is exact.',
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
