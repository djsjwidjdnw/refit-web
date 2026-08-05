import Link from 'next/link';
import type { Metadata } from 'next';
import { BrandMark } from '../brand-mark';

export const metadata: Metadata = {
  title: 'Getting started with ReFitIQ',
  description:
    'Everything your shop needs in the first 15 minutes: create your shop, get the app, invite your crew, set roles, and start capturing.',
};

// Source of truth for this page is ReFit_Getting_Started.md — substance is unchanged,
// only the formatting is adapted for the web (numbered step cards, a real roles table,
// collapsible questions). Keep the two in sync if either changes.

// The iOS listing is live and free; verified against the iTunes lookup API. There is no
// Google Play listing yet, so this page says iPhone and nothing else.
const APP_STORE_URL = 'https://apps.apple.com/us/app/refit/id6772761520';

const ROLES = [
  {
    role: 'Admin',
    can: 'Everything — approves requests, manages the shop and billing',
  },
  {
    role: 'Team Lead',
    can: 'Their assigned boats. Requests replace/refurbish, marks parts ordered/received, assigns tasks',
  },
  {
    role: 'Tech',
    can: 'Their assigned boats. Captures and edits, requests replace/refurbish (admin approves)',
  },
  {
    role: 'Parts',
    can: 'Sees all boats read-only. Adds notes, QR codes, marks ordered/received, adds tracking numbers',
  },
];

const QUESTIONS = [
  {
    q: 'Do I need a QR sticker for every part?',
    a: 'No. The app can auto-number ("Label 1, Label 2…") or you can type your own labels. QR stickers are just faster to scan and harder to mix up.',
  },
  {
    q: 'Can two people work the same boat at once?',
    a: "Yes. Assign the boat to whoever's on it — everyone's captures land in the same record.",
  },
  {
    q: 'What happens when the trial ends?',
    a: 'Pick a plan on refit-iq.com. If a payment fails you get 14 days’ grace, then the app goes read-only — you can still view and export everything, you just can’t add new work until it’s sorted. Your records are never deleted.',
  },
  {
    q: 'What if a tech leaves?',
    a: 'Remove them in Team. Their work stays on the job, attributed to them.',
  },
  {
    q: 'Can office staff see the records without using the app?',
    a: 'Export the job and share the file. A full web view is on the way.',
  },
];

const STEPS = [
  { n: 1, title: 'Create your shop', id: 'create-your-shop' },
  { n: 2, title: 'Get the app', id: 'get-the-app' },
  { n: 3, title: 'Invite your crew', id: 'invite-your-crew' },
  { n: 4, title: "Set everyone's role", id: 'set-roles' },
  { n: 5, title: 'Create your first job', id: 'first-job' },
  { n: 6, title: 'Start capturing', id: 'start-capturing' },
  { n: 7, title: 'Reassembly — the payoff', id: 'reassembly' },
  { n: 8, title: 'Export the record', id: 'export' },
];

export default function GettingStarted() {
  return (
    <>
      <header className="container">
        <nav className="nav">
          <BrandMark lockup="compact" height={26} href="/" className="nav-brand" />
          <div className="row">
            <Link href="/login" className="btn btn-ghost">
              Sign in
            </Link>
            <Link href="/signup?src=gs-nav" className="btn btn-primary">
              Start free trial
            </Link>
          </div>
        </nav>
      </header>

      <main className="container doc">
        <div className="eyebrow">Getting started</div>
        <h1 className="doc-h1">Getting started with ReFitIQ</h1>
        <p className="doc-lede">Everything your shop needs in the first 15 minutes.</p>

        <nav className="toc" aria-label="On this page">
          <div className="toc-label">On this page</div>
          <ol>
            {STEPS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
            <li>
              <a href="#questions">Common questions</a>
            </li>
          </ol>
        </nav>

        <section className="step-block" id="create-your-shop">
          <h2>
            <span className="step-num">1</span> Create your shop
          </h2>
          <p>
            Sign up at <strong>refit-iq.com</strong> with your email and shop name. That creates
            your shop and starts your <strong>14-day free trial</strong> — full access, every
            feature, cancel anytime. We collect a card at signup, but nothing is charged during
            the 14 days. Cancel before it ends and you pay nothing.
          </p>
          <p>
            The person who signs up becomes the <strong>Admin</strong> (that&apos;s you — the owner
            or manager). Admins don&apos;t take up a paid seat.
          </p>
          <Link href="/signup?src=gs-step1" className="btn btn-primary">
            Start your free trial
          </Link>
        </section>

        <section className="step-block" id="get-the-app">
          <h2>
            <span className="step-num">2</span> Get the app
          </h2>
          <p>
            Download <strong>ReFitIQ</strong> from the App Store on the iPhone your crew will use in
            the yard. Sign in with the account you just created.
          </p>
          <p>
            The app is where the work happens. The website is where you handle billing and your
            team.
          </p>
          <a
            className="btn btn-ghost"
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get ReFitIQ on the App Store →
          </a>
        </section>

        <section className="step-block" id="invite-your-crew">
          <h2>
            <span className="step-num">3</span> Invite your crew
          </h2>
          <p>
            In the app, open <strong>Team</strong>. Tap <strong>Invite</strong> — you&apos;ll get a
            link and a QR code.
          </p>
          <p>
            Send the link to a tech (text, email, whatever) or let them scan the QR. They sign up,
            and you&apos;ll see them under <strong>Pending</strong> — tap <strong>Approve</strong>{' '}
            and they&apos;re in.
          </p>
        </section>

        <section className="step-block" id="set-roles">
          <h2>
            <span className="step-num">4</span> Set everyone&apos;s role
          </h2>
          <p>
            This is the step most shops skip, and it&apos;s the one that makes ReFitIQ work the way
            you want.
          </p>
          <p>
            In <strong>Team</strong>, set each person&apos;s role:
          </p>
          <div className="table-wrap">
            <table className="roles">
              <thead>
                <tr>
                  <th scope="col">Role</th>
                  <th scope="col">What they can do</th>
                </tr>
              </thead>
              <tbody>
                {ROLES.map((r) => (
                  <tr key={r.role}>
                    <th scope="row">{r.role}</th>
                    <td>{r.can}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            New people default to <strong>Tech</strong>. Change it any time — search the list, tap
            the role.
          </p>
        </section>

        <section className="step-block" id="first-job">
          <h2>
            <span className="step-num">5</span> Create your first job
          </h2>
          <p>
            Tap <strong>+</strong> to add a boat. Give it a name, vessel type, and a note about the
            work (e.g. <em>&ldquo;Insurance job — repair fire damage, full paint&rdquo;</em>).
          </p>
          <p>
            Add your <strong>areas</strong> — foredeck, cockpit, flybridge, hull, whatever fits the
            boat. This is how everything gets organized, and it&apos;s what makes reassembly fast
            later.
          </p>
        </section>

        <section className="step-block" id="start-capturing">
          <h2>
            <span className="step-num">6</span> Start capturing
          </h2>
          <p>This is the core of ReFitIQ. As your crew strips the boat down:</p>
          <ol className="steps-ol">
            <li>
              Tap <strong>+</strong> to capture.
            </li>
            <li>
              Choose <strong>Single item</strong> (one piece plus its fasteners) or{' '}
              <strong>Component</strong> (a door or window holding several pieces — each gets its
              own code).
            </li>
            <li>Label it — scan a QR sticker, let the app auto-number it, or type your own.</li>
            <li>
              <strong>Photograph it.</strong> Close up, fill the frame, get any markings.
            </li>
            <li>
              Add the <strong>fasteners</strong> — size, type, material, quantity. Add{' '}
              <strong>gaskets</strong> the same way.
            </li>
            <li>
              Add a <strong>voice note</strong> if there&apos;s something the photos won&apos;t say.
            </li>
          </ol>
          <p>
            Flag anything that needs replacing as you go. Do it once, properly, and reassembly takes
            care of itself.
          </p>
        </section>

        <section className="step-block" id="reassembly">
          <h2>
            <span className="step-num">7</span> Reassembly — the payoff
          </h2>
          <p>
            Open the job and work the record in reverse. Every part, every fastener, every photo,
            organized by area and component. No guessing which bolt went where.
          </p>
          <p>
            Use the <strong>fastener totals</strong> (broken out by area) to order what you need,
            and the <strong>replace/refurbish</strong> list to see everything flagged.
          </p>
        </section>

        <section className="step-block" id="export">
          <h2>
            <span className="step-num">8</span> Export the record
          </h2>
          <p>
            Open a job → <strong>Export</strong>:
          </p>
          <ul className="feature-list doc-list">
            <li>
              <b>Excel / CSV / JSON / PDF</b> — the full job record
            </li>
            <li>
              <b>All photos (.zip)</b> — every photo, in folders by area and part
            </li>
          </ul>
          <p>
            Save it to your own system, email it to the customer, or file it for the insurance job.
          </p>
          <div className="callout">
            <strong>One tip:</strong> if you&apos;re saving the photo zip to SharePoint or OneDrive,{' '}
            <strong>extract the zip first</strong>. Photos inside a zipped folder won&apos;t open in
            a browser preview.
          </div>
        </section>

        <div className="oneline">
          <div className="oneline-k">The workflow, in one line</div>
          <div className="oneline-v">
            Tear down → capture everything → flag what needs replacing → order it → reassemble from
            the record → export it.
          </div>
        </div>

        <section id="questions">
          <div className="section-label">Common questions</div>
          <div className="faq">
            {QUESTIONS.map((f) => (
              <details key={f.q} className="faq-item">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section>
          <div className="closer card">
            <h2>Need help?</h2>
            <p>
              Email{' '}
              <a href="mailto:support@refit-iq.com" style={{ color: 'var(--accent)' }}>
                support@refit-iq.com
              </a>{' '}
              — a marine mechanic who uses ReFitIQ every day will answer.
            </p>
            <div className="row hero-cta">
              <Link href="/signup?src=gs-footer" className="btn btn-primary">
                Start your 14-day free trial
              </Link>
              <Link href="/" className="btn btn-ghost">
                Back to home
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-links">
            <Link href="/">Home</Link>
            <Link href="/getting-started">Getting started</Link>
            <Link href="/login">Sign in</Link>
            <a href="mailto:support@refit-iq.com">support@refit-iq.com</a>
          </div>
          <div>© {new Date().getFullYear()} ReFitIQ · refit-iq.com</div>
        </div>
      </footer>
    </>
  );
}
