import type { Metadata } from 'next';
import { CtaLink } from '../../cta-link';

// Features, by who uses them (Jon, 17 Nov 2026). Only what the app does in the builds on the
// App Store and Google Play today. Not listed until 1.6.0 is public: hands-free fastener
// entry, video, location at scan and Face ID / fingerprint sign-in.
export const metadata: Metadata = {
  title: 'Features | ReFitIQ',
  description:
    'What ReFitIQ does for each person in the shop: techs capture and find parts, team leads run the work, the parts desk orders, and admins set up the shop.',
  alternates: { canonical: '/features' },
};

const ROLES = [
  {
    role: 'Techs',
    sub: 'The people taking it apart and putting it back.',
    items: [
      'Photograph a part where it sits, then label it with a QR sticker, an auto-numbered bag or a typed name.',
      'Write down its fasteners in full: count, thread, length, head, drive and material. Gaskets, hoses, fittings, pins, bushings and seals too.',
      'Leave a voice note; it is transcribed onto the part. Mark up a photo to point at the detail that matters.',
      'Scan a sticker anywhere in the shop to open that part, with the photo of where it came off.',
      'Move each part through its stages: removed, ready for install, installed. The app records who and when.',
      'Keep a notes thread on the part for whoever picks it up next.',
      'Work with no signal. Download a whole job, or one area of it, to open in a shed or under a hull.',
      'Look things up on the spot: drill charts for pilot holes and tap drills, and a list of hardware definitions.',
    ],
  },
  {
    role: 'Team leads and project managers',
    sub: 'The people running the job.',
    items: [
      'Assign tasks to the crew on a job, and follow them across every boat in one tracker.',
      'Set the job’s completion date and see how many days are left on the job list.',
      'Get reminded when parts were captured but never given a stage.',
      'Use scan mode to log parts quickly and leave the fasteners for later. The file is marked so a tech can find it.',
      'Ask for a part to be replaced or refurbished. An admin approves it.',
    ],
  },
  {
    role: 'Parts desk',
    sub: 'The people ordering what goes back on.',
    items: [
      'See every part flagged to replace or refurbish on one list, filtered by to order, ordered and received, with tracking numbers.',
      'Add up the replacement fasteners across the whole job, with each total traced back to the parts it came from.',
      'Export the order sheet as PDF, Excel or CSV.',
      'Mark refurbish work done, with who and when.',
      'See every job in the shop. Parts staff track orders but do not edit the part records.',
    ],
  },
  {
    role: 'Admins',
    sub: 'The owner, or whoever sets up the shop.',
    items: [
      'Give each person a role (admin, team lead, tech or parts) and put them on the jobs they work.',
      'Invite the crew with a link or a QR code, and approve their requests to join.',
      'Set up departments, and filter any job by them.',
      'Decide each part’s disposition: do not remove, refurbish, replace, remove and reinstall, or deleted.',
      'Approve or deny replace and refurbish requests from one inbox.',
      'Export a whole job with the photos attached: Excel, CSV, JSON, PDF or a web report.',
      'Keep completed jobs as records, and handle billing on this website.',
    ],
  },
];

const OBJECTIONS = [
  {
    q: '“One more thing for my crew to do.”',
    a: 'Capturing a part is a photograph and a sticker. If you have no stickers the app numbers the bag for you. It runs offline anywhere in the shop and syncs when the phone finds signal.',
  },
  {
    q: '“We already have a system.”',
    a: 'Bags and masking tape work. This is the same method with the photographs attached and the counts kept, so it survives the tech who tore it down leaving mid-job. If what you run already does that, you don’t need us.',
  },
];

export default function Features() {
  return (
    <>
      <section className="container page-hero">
        <div className="eyebrow">Features</div>
        <h1>What it does for each person in the shop</h1>
        <p className="lede">
          Everyone works from the same record of the job. What each person can see and change
          depends on their role.
        </p>
      </section>

      <section className="container page-section">
        <div className="role-grid">
          {ROLES.map((r) => (
            <div key={r.role} className="role">
              <h2>{r.role}</h2>
              <p className="role-sub">{r.sub}</p>
              <ul>
                {r.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="container page-section s-obj">
        <h2 className="section-head">What owners ask first</h2>
        <div className="objections">
          {OBJECTIONS.map((o) => (
            <div key={o.q} className="obj">
              <div className="obj-q">{o.q}</div>
              <p className="obj-a">{o.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container page-cta">
        <CtaLink src="features">Start your free trial</CtaLink>
        <span className="mid-cta-note">14 days, every feature, every tech on your crew.</span>
      </section>
    </>
  );
}
