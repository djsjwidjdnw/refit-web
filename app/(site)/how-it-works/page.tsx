import type { Metadata } from 'next';
import { CtaLink } from '../../cta-link';
import { ScreenShot } from '../../components/screen-shot';
import { HOW_SHOTS } from '@/lib/site-content';

// How it works (Jon, 17 Nov 2026): the eight screens from Jon's package, in Jon's order, each in a
// phone frame beside (desktop) or below (phone) its heading and caption, sides alternating.
// Tap a screen to open it at full size. Images: scripts/make-how-it-works-shots.mjs.
export const metadata: Metadata = {
  title: 'How it works | ReFitIQ',
  description:
    'Eight screens from a real refit: the job list, the project, the photo gallery, a part and its plan, its fasteners, its history, and one list of replacements to order.',
  alternates: { canonical: '/how-it-works' },
};

export default function HowItWorks() {
  return (
    <>
      <section className="container page-hero">
        <div className="eyebrow">How it works</div>
        <h1>From the teardown to the reinstall</h1>
        <p className="lede">
          Your techs photograph each part where it sits and put a sticker on it. Months later,
          whoever puts it back scans the sticker and sees all of it. These are real screens from
          a refit at Philbrook&apos;s Boatyard.
        </p>
      </section>

      <section className="container">
        <div className="walk">
          {HOW_SHOTS.map((s, i) => (
            <article key={s.name} className={`walk-row${i % 2 ? ' flip' : ''}`}>
              <div className="walk-copy">
                <div className="walk-n">{String(i + 1).padStart(2, '0')}</div>
                <h2>{s.heading}</h2>
                <p>{s.copy}</p>
              </div>
              <div className="walk-shot">
                <ScreenShot name={s.name} w1={s.w1} w2={s.w2} full={s.full} alt={s.alt} eager={i === 0} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="container page-cta">
        <CtaLink src="how-it-works">Start your free trial</CtaLink>
        <span className="mid-cta-note">14 days, every feature, every tech on your crew.</span>
      </section>
    </>
  );
}
