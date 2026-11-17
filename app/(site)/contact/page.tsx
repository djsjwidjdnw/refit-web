import type { Metadata } from 'next';
import { PRIVACY_URL } from '@/lib/stores';
import { ACCOUNT_DELETION_URL, SUPPORT_EMAIL } from '@/lib/site-content';

// Contact and support (Jon, 17 Nov 2026): one address for everything.
export const metadata: Metadata = {
  title: 'Contact and support | ReFitIQ',
  description: 'Email support@refit-iq.com for help with the app, billing, a larger shop, or your account.',
  alternates: { canonical: '/contact' },
};

export default function Contact() {
  return (
    <>
      <section className="container page-hero">
        <div className="eyebrow">Contact</div>
        <h1>Contact and support</h1>
        <p className="lede">One address for help with the app, billing, pricing for a larger shop, or your account.</p>
      </section>

      <section className="container page-section">
        <div className="contact-card">
          <a className="big" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          <p>
            Tell us your shop&apos;s name and the email you sign in with. If something in the app
            went wrong, say which job and part, and what you tapped. A screenshot helps.
          </p>
        </div>
      </section>

      <section className="container page-section">
        <h2>Your data</h2>
        <p style={{ maxWidth: 640 }}>
          How we handle your information is in the <a className="proof-link" href={PRIVACY_URL}>privacy policy</a>.
          You can delete your account from inside the app or by email:{' '}
          <a className="proof-link" href={ACCOUNT_DELETION_URL}>
            how to delete your account
          </a>
          .
        </p>
      </section>
    </>
  );
}
