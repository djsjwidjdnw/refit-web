import Link from 'next/link';
import { StoreBadges } from './store-badges';
import { PRIVACY_URL } from '@/lib/stores';
import { ACCOUNT_DELETION_URL, SITE_PAGES, SUPPORT_EMAIL } from '@/lib/site-content';

// The same footer on every page of the site (Jon, 17 Nov 2026): the pages, privacy, account
// deletion, the support address, both store badges and the copyright line.
export function SiteFooter() {
  return (
    <footer className="footer site-footer">
      <div className="container">
        <StoreBadges className="center" />
        <nav className="footer-links" aria-label="Footer">
          <Link href="/">Home</Link>
          {SITE_PAGES.map((p) => (
            <Link key={p.href} href={p.href}>
              {p.label}
            </Link>
          ))}
          <Link href="/getting-started">Getting started</Link>
          <Link href="/login">Sign in</Link>
        </nav>
        <div className="footer-links">
          <a href={PRIVACY_URL}>Privacy policy</a>
          <a href={ACCOUNT_DELETION_URL}>Delete your account</a>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </div>
        <div>© {new Date().getFullYear()} ReFitIQ · refit-iq.com</div>
      </div>
    </footer>
  );
}
