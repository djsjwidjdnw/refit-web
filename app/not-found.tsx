import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from './components/site-nav';
import { SiteFooter } from './components/site-footer';

// Jon 17 Nov #11: a page that does not exist says so, with a way back, instead of the bare
// framework 404 under the home page's title.
export const metadata: Metadata = {
  title: 'Page not found | ReFitIQ',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <>
    <SiteNav />
    <main className="container" style={{ padding: '72px 16px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 32, margin: '0 0 12px' }}>That page isn&apos;t here</h1>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 24px' }}>
        The link may be old, or the address may have a typo.
      </p>
      <p style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/" className="btn btn-primary">
          Go to the home page
        </Link>
        <a href="mailto:support@refit-iq.com" className="btn btn-ghost">
          Email support
        </a>
      </p>
    </main>
    <SiteFooter />
    </>
  );
}
