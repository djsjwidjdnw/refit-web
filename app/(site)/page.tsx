import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { CtaLink } from '../cta-link';
import { StoreBadges } from '../components/store-badges';
import { ScreenShot } from '../components/screen-shot';
import { StickyCta } from '../sticky-cta';
import { HashRedirect } from '../components/hash-redirect';
import { HOW_SHOTS } from '@/lib/site-content';

// Home (Jon, 17 Nov 2026). The one long page became a site; Home keeps the headline, one line
// of pitch, three benefits, a short look at the app, the Philbrook's credit, the store badges
// and the call to action. Everything else moved to its own page, and the old in-page anchors
// (#how) are sent there by HashRedirect.
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'ReFitIQ. You pay for that teardown twice.',
  description:
    'An iPhone and Android app for shop owners. Your techs tag every part as it comes off, so whoever puts it back has what he needs. Built at Philbrook’s Boatyard. 14 days free.',
  alternates: { canonical: '/' },
};

// ── HOUSE STYLE FOR EVERY USER-VISIBLE STRING ON THIS SITE ──────────────────────────
// The reader is a tradesman in his fifties who owns the shop: a boatyard, a restoration
// or body shop, a heavy-equipment yard, an aircraft maintenance outfit. Same man in all
// four. He can smell copy that was generated, and the site took real backlash for exactly
// that. So:
//
//   • NO em-dashes or en-dashes in rendered text. Full stops and commas only. (These
//     code comments are not rendered, so they still use them.)
//   • No "here's the thing", "actually", "no more guessing", "seamlessly", "streamline",
//     "empower", "unlock", "elevate", "game-changer", and no "it isn't just X, it's Y".
//   • No lists of three in rhythm. Two things, or four, or a sentence.
//   • NEVER MENTION PAYMENT CARDS. Not "no card", not "no credit card required", not
//     "we don't ask for a card". The fact is true and the page used to lean on it hard,
//     but naming the thing you are not taking is the register of a site that expects to
//     be distrusted, and it put that register on the primary button. State the offer
//     instead: 14 days free, every feature, cancel anytime, you only pay if you pick a
//     plan. (`className="card"` is a stylesheet class and is unrelated.)
//   • No rhetorical questions as headings.
//   • Short declarative sentences. Trade words. Real numbers and real parts.
//   • And do not overcorrect into fake yard-talk. He spots forced folksiness as fast as
//     he spots a language model. Neutral, direct, unpolished but competent.
//   • TRADE-NEUTRAL IN THE COPY, MARINE IN THE PROOF. Every claim is written so a car
//     restorer, an excavator shop and an aircraft outfit read themselves into it: job,
//     teardown, part, fastener, shop. But every PROOF asset stays exactly what it is —
//     the Philbrook's credit, the screenshots, the alt text describing them, the boat in
//     the logo. Those are photographs of a real job at a real yard, and neutering them
//     would trade the one checkable thing on the page for nothing.
//   • THE FOUR TRADES ARE A STATEMENT OF FACT, NOT A TARGET LIST. ReFitIQ is in use in
//     marine, automotive, heavy equipment and aviation shops, so the page says so plainly
//     and without hedging. Note that shops.industry will NOT corroborate this: it only
//     records what a shop picked at signup, the picker shipped after most of them were
//     created, and it defaults every pre-0048 row to marine. Do not "correct" this copy
//     from a query against that column. If the mix ever changes, change the sentence.
// ─────────────────────────────────────────────────────────────────────────────────────

// Jon, 17 Nov: he asked for three benefits on Home, so there are three; they are written at
// different lengths so they do not read as a rhythm.

const TEASER = HOW_SHOTS.filter((s) => ['01-jobs', '05-part-plan', '08-replacements'].includes(s.name));

export default function Home() {
  return (
    <>
      <HashRedirect />
      <section className="container hero-split">
        <div className="hero-copy">
          <div className="eyebrow">Track. Tag. Reinstall.</div>
          <h1>You pay for that teardown twice.</h1>
          <p>
            An iPhone and Android app for shop owners. Your techs tag every part as it comes
            off, so whoever puts it back has what he needs.
          </p>
          <div className="hero-cta">
            <CtaLink src="hero">Start your free trial</CtaLink>
          </div>
          <div className="hero-note">458 parts off one teardown, on the screen below.</div>
          <div className="hero-trust">
            <span>14 days free, then $99 to $299 a month.</span>
          </div>
        </div>
        <div className="hero-shot">
          <div className="shot">
            <Image
              src="/shots/boat-file-3.webp"
              alt="A ReFitIQ boat file mid-refit for Castaway-6469: 64 parts flagged to replace, 458 captures, 82 of them on the foredeck, with areas for flybridge and the rest of the vessel."
              width={1206}
              height={2415}
              priority
              sizes="(min-width: 760px) 380px, 340px"
            />
          </div>
          <div className="shot-caption">Real screens from the app. Not mockups.</div>
          <div className="hero-meta">iPhone and Android. Works with no signal.</div>
        </div>
      </section>

      <section className="container page-section">
        <ul className="benefits">
          <li>
            <b>Every part comes back with its photo.</b>
            <span>The tech who puts it back sees where it came off and the fasteners it takes.</span>
          </li>
          <li>
            <b>One list of what to order.</b>
            <span>Replacements and their fasteners add up across the whole job, traced back to each part, with what is already ordered ticked off.</span>
          </li>
          <li>
            <b>Works in the shed.</b>
            <span>Capture with no signal; it syncs later.</span>
          </li>
        </ul>
      </section>

      <section className="container page-section">
        <h2 className="section-head">A look at the app</h2>
        <div className="teaser">
          {TEASER.map((s) => (
            <ScreenShot key={s.name} name={s.name} w1={s.w1} w2={s.w2} full={s.full} alt={s.alt} />
          ))}
        </div>
        <p style={{ marginTop: 16 }}>
          <Link href="/how-it-works" className="proof-link">
            See how it works, screen by screen
          </Link>
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
            <h2 className="yard-head">Built at Philbrook&apos;s Boatyard</h2>
            <p className="yard-lede">
              ReFitIQ was built at Philbrook&apos;s Boatyard in Sidney, British Columbia, with the
              technicians who use it, on refits their crew was running at the time.
            </p>
            <p className="yard-close">
              The boat file at the top of this page is one of their jobs. A Nordhavn 60, and 458
              parts logged off it by the crew who pulled them.{' '}
              <Link href="/about" className="proof-link">
                About ReFitIQ
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="container s-closer">
        <div className="closer card" data-sticky-stop>
          <h2>Start on your next teardown.</h2>
          <p>
            Fourteen days with every feature and every tech on your crew. You are not billed until
            you pick a plan, and if you never pick one, nothing is deleted.
          </p>
          <div className="row hero-cta">
            <CtaLink src="closer">Start your free trial</CtaLink>
          </div>
          <p className="closer-note">Then get the app on the phones your crew uses.</p>
          <StoreBadges className="center" />
        </div>
      </section>

      <StickyCta />
    </>
  );
}
