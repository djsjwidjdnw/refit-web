import type { Metadata } from 'next';
import Link from 'next/link';
import { CtaLink } from '../../cta-link';
import { StoreBadges } from '../../components/store-badges';

// Get the app (Jon, 17 Nov 2026): both store listings (lib/stores; the App Store id from the
// App Store Connect API, 6772761520) and how a shop and its crew get started.
export const metadata: Metadata = {
  title: 'Get the app | ReFitIQ',
  description: 'ReFitIQ for iPhone on the App Store and for Android on Google Play. Sign in with the account your shop set up.',
  alternates: { canonical: '/get-the-app' },
};

export default function GetTheApp() {
  return (
    <>
      <section className="container page-hero">
        <div className="eyebrow">Get the app</div>
        <h1>ReFitIQ for iPhone and Android</h1>
        <p className="lede">The same app on both, free to download. Your shop&apos;s plan covers your crew.</p>
        <div style={{ marginTop: 24 }}>
          <StoreBadges />
        </div>
      </section>

      <section className="container page-section">
        <h2>Setting up a new shop</h2>
        <ol className="get-steps">
          <li>
            Start a free trial on this website. It takes a shop name, a work email and a password.
          </li>
          <li>Download ReFitIQ from the App Store or Google Play.</li>
          <li>Sign in with the same email and password, and invite your crew from the app.</li>
        </ol>
        <p style={{ marginTop: 16 }}>
          <Link href="/getting-started" className="proof-link">
            The full getting started guide
          </Link>
        </p>
      </section>

      <section className="container page-section">
        <h2>Joining your shop</h2>
        <p style={{ maxWidth: 640 }}>
          If your shop already uses ReFitIQ, open the invite link your admin sent you, or ask for
          the shop&apos;s code. Then download the app and sign in. Your admin lets you in and puts
          you on the jobs you work.
        </p>
      </section>

      <section className="container page-cta">
        <CtaLink src="get-the-app">Start your free trial</CtaLink>
        <span className="mid-cta-note">For shop owners. Crew join through the shop&apos;s invite.</span>
      </section>
    </>
  );
}
