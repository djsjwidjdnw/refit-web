import Link from 'next/link';

// Shown on /dashboard while a shop is still trialing. Without this the page a new shop
// owner lands on right after signup talks only about plans and seats, which is the one
// thing they do not need to do yet — the trial is already running. What they actually
// need is the app on a phone and their crew invited.
//
// The App Store listing is live and free (verified against the iTunes lookup API); there
// is no Google Play listing, so this deliberately says iPhone only.
const APP_STORE_URL = 'https://apps.apple.com/us/app/refit/id6772761520';

export function NextSteps() {
  return (
    <div className="card next-steps">
      <h2>Next steps</h2>
      <ol>
        <li>
          <strong>Get the app.</strong> Download ReFit on the iPhone your crew will use in the
          yard and sign in with this account.
          <div className="ns-actions">
            <a className="btn btn-primary" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
              Get ReFit on the App Store →
            </a>
          </div>
        </li>
        <li>
          <strong>Invite your crew.</strong> In the app, open <em>Team</em> → <em>Invite</em> to
          get a link and QR code. Approve them under <em>Pending</em>.
        </li>
        <li>
          <strong>Set everyone&apos;s role.</strong> Admin, team lead, tech or parts — this is the
          step most shops skip, and it decides who sees which boats.
        </li>
        <li>
          <strong>Create your first job</strong> and start capturing as you tear down.
        </li>
      </ol>
      <p className="ns-foot">
        Full walkthrough:{' '}
        <Link href="/getting-started" style={{ color: 'var(--accent)', fontWeight: 700 }}>
          Getting started with ReFit →
        </Link>
      </p>
    </div>
  );
}
