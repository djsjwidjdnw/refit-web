import type { Metadata } from 'next';
import Image from 'next/image';
import { CtaLink } from '../../cta-link';
import { OutboundLink } from '../../outbound-link';
import { APP_STORE_URL, PLAY_URL } from '@/lib/stores';

// About (Jon, 17 Nov 2026): built in a working boatyard, with Philbrook's Boatyard in Sidney,
// BC. The copy is a CREDIT: they built it with us and the shape of the product came from their
// technicians. No disclaimer is attached to it, and none may be (see the house style).
export const metadata: Metadata = {
  title: 'About | ReFitIQ',
  description:
    'ReFitIQ was built at Philbrook’s Boatyard in Sidney, British Columbia, with the technicians who use it, on refits their crew was running at the time.',
  alternates: { canonical: '/about' },
};

export default function About() {
  return (
    <>
      <section className="container page-hero">
        <div className="eyebrow">About</div>
        <h1>Built in a working boatyard</h1>
        <p className="lede">
          ReFitIQ was built at Philbrook&apos;s Boatyard in Sidney, British Columbia, with the
          technicians who use it, on refits their crew was running at the time.
        </p>
      </section>

      <section className="yard-band">
        <div className="container yard">
          <div className="yard-plate">
            <Image
              src="/brand/philbrooks.png"
              alt="Philbrook’s Boatyard Ltd., Sidney, British Columbia"
              width={460}
              height={172}
              sizes="(min-width: 760px) 300px, 244px"
            />
          </div>
          <div className="yard-copy">
            <h2 className="yard-head">Philbrook&apos;s Boatyard</h2>
            <p>
              They decided what it had to do. What a capture has to hold, and what the record needs
              to say in March when the boat goes back together: that came from the people doing
              the work, while they were doing it.
            </p>
            <p className="yard-close">
              The boat file on the home page is one of their jobs. A Nordhavn 60, and 458 parts
              logged off it by the crew who pulled them.
            </p>
          </div>
        </div>
      </section>

      <section className="container page-section s-problem">
        <h2 className="section-head">Why it exists</h2>
        <ul className="cost-list">
          <li>The tech who tore it down is on another job.</li>
          <li>Two techs standing at the bench, sorting bags they didn’t fill.</li>
          <li>Fasteners ordered a second time because the first count was never written down.</li>
          <li>A delivery date that moves, and a callback you can’t argue from memory.</li>
        </ul>
        <p className="section-sub">
          None of it is logged, so none of it is a line item. It shows up as a job that ran three
          weeks long and a margin you can’t account for.
        </p>
      </section>

      <section className="container page-section s-proof">
        <ul className="proof-lines">
          <li>
            <b>Built in a boatyard. Used in shops across marine, automotive, heavy equipment and
            aviation.</b> A teardown is a teardown. The part came off something, it has to go back
            on, and the person who takes it off is not always the person who puts it back.
          </li>
          <li>
            <b>It is on the App Store and Google Play.</b> Both listings are public, and the screens
            on this site come out of the app.{' '}
            <OutboundLink href={APP_STORE_URL} dest="app-store" className="proof-link">
              App Store
            </OutboundLink>
            {' · '}
            <OutboundLink href={PLAY_URL} dest="google-play" className="proof-link">
              Google Play
            </OutboundLink>
          </li>
          <li>
            <b>The record stays yours.</b> Export the whole job with the photos attached, whether
            you keep paying or not. Nothing is deleted if you stop.
          </li>
        </ul>
      </section>

      <section className="container page-cta">
        <CtaLink src="about">Start your free trial</CtaLink>
        <span className="mid-cta-note">14 days, every feature, every tech on your crew.</span>
      </section>
    </>
  );
}
