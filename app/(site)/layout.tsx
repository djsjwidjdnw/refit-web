import { SiteNav } from '../components/site-nav';
import { SiteFooter } from '../components/site-footer';

// Every page of the marketing site: the same top bar and the same footer (Jon, 17 Nov 2026).
// Sign-in, signup, join, the dashboard, ops and the auth pages are NOT in this group and keep
// their own layouts exactly as they were.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
