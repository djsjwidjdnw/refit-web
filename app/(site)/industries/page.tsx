import type { Metadata } from 'next';
import { CtaLink } from '../../cta-link';

// Industries (Jon, 17 Nov 2026): marine, automotive and construction, the three trades the app
// has its own vocabulary for (the signup picker). Written from each trade's own calendar.
// Aircraft maintenance stays named as a fact (house style, app/(site)/page.tsx).
export const metadata: Metadata = {
  title: 'Industries | ReFitIQ',
  description:
    'ReFitIQ in boatyards, restoration and body shops, and heavy equipment yards: the teardown is the same job in all of them.',
  alternates: { canonical: '/industries' },
};

const TRADES = [
  {
    name: 'Marine',
    line: 'Boatyards and marine service shops.',
    body: 'Refits and repowers that run past the season and change hands between techs while the boat sits open. ReFitIQ was built in one: Philbrook’s Boatyard in Sidney, British Columbia. The app speaks in vessels and their areas, and carries a list of hundreds of marine hardware terms with their definitions.',
  },
  {
    name: 'Automotive',
    line: 'Restoration and body shops.',
    body: 'A car goes on the rotisserie in one year and comes off it in another, and the trim is in bags on a shelf the whole time. Each piece keeps its photo, its fasteners and the panel it came from, so the car goes back together the way it came apart.',
  },
  {
    name: 'Construction',
    line: 'Heavy equipment yards.',
    body: 'An excavator stripped to the frame, where every pin, bushing and shim goes back exactly where it came from. Pins, bushings and seals are recorded alongside the fasteners, each against the part it belongs to.',
  },
];

export default function Industries() {
  return (
    <>
      <section className="container page-hero">
        <div className="eyebrow">Industries</div>
        <h1>The teardown is the same job</h1>
        <p className="lede">
          The part came off something, it has to go back on, and the person who takes it off is
          not always the person who puts it back. When you sign up you pick your trade, and the
          app uses its words.
        </p>
      </section>

      <section className="container page-section">
        <div className="role-grid">
          {TRADES.map((t) => (
            <div key={t.name} className="role">
              <h2>{t.name}</h2>
              <p className="role-sub">{t.line}</p>
              <p style={{ margin: 0 }}>{t.body}</p>
            </div>
          ))}
          <div className="role">
            <h2>Other shops</h2>
            <p className="role-sub">Aircraft maintenance, and anyone else who strips things down.</p>
            <p style={{ margin: 0 }}>
              ReFitIQ is also running in aircraft maintenance, where work gets evidenced afterwards
              with a photograph of the part in place and the fasteners it took. Whatever you run,
              the roles are separate: admins, team leads, techs and parts staff, each assigned to
              the jobs they work.
            </p>
          </div>
        </div>
      </section>

      <section className="container page-cta">
        <CtaLink src="industries">Start your free trial</CtaLink>
        <span className="mid-cta-note">Pick your trade when you sign up. 14 days free.</span>
      </section>
    </>
  );
}
