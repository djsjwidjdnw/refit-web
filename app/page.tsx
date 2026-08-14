import Link from 'next/link';
import Image from 'next/image';
import { createPublicClient } from '@/lib/supabase/public';
import RoiCalculator from './roi-calculator';
import { CtaLink } from './cta-link';
import { OutboundLink } from './outbound-link';
import { StickyCta } from './sticky-cta';
import { BrandMark } from './brand-mark';

// ISR rather than force-dynamic. The page renders nothing user-specific, so making every
// ad click wait on a cookie read plus a Supabase round trip before first byte bought
// nothing. Pricing is still read from billing_plans — just at most once per window, off
// the request path.
export const revalidate = 300;

// ─────────────────────────────────────────────────────────────────────────────────────
// THIS PAGE IS A DIRECT-RESPONSE PAGE, NOT A BROCHURE.
//
// It answers one measurement: 122 visitors in seven days, 121 of them landed here, ONE
// reached /signup, 91% bounce. 109 came from Facebook or Instagram, on phones. The ad
// holds attention (43% three-second hold), so nothing upstream is broken — the first
// screen was.
//
// Four things governed every decision below:
//
//   1. THE BUYER IS THE OWNER, NOT THE TECH. The page used to promise "put it back
//      together without guessing" to "refit and boatyard CREWS". That is the problem of
//      the person in the bilge, sold to the person who signs their cheque. He is not the
//      one at the bulkhead; he is the one paying for the hour it takes.
//
//   2. THE FIRST SCREEN HAS 664px AND MUST SPEND THEM ON WHAT / WHO / WHY / WHAT IT
//      COSTS TO TRY. Every block in the hero is budgeted in px against a 390px phone —
//      see the comments on each. Adding one line to the H1 costs 40px of screenshot.
//
//   3. BELIEF BEFORE ASK. The one real credential (Philbrook's) used to sit at y≈5,467
//      on an 8,408px page, and the $130,000 arithmetic came before any reason to think
//      the product existed. Proof now lands immediately after the fold; the numbers come
//      after the product has been shown.
//
//   4. NOTHING ON THIS PAGE MAY OVERSTATE THE PRODUCT — and, just as strictly, nothing
//      may UNDERSTATE it. The old FAQ said a card is collected when the trial starts.
//      That was never true: 0028_provision_new_shop.sql opens the trial without touching
//      Stripe.
//
// ── HOUSE STYLE FOR EVERY USER-VISIBLE STRING ON THIS SITE ──────────────────────────
// The reader is a boatyard owner in his fifties. He can smell copy that was generated,
// and the site took real backlash for exactly that. So:
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
// ─────────────────────────────────────────────────────────────────────────────────────

type Tier = {
  plan: string;
  display_name: string;
  price_usd_monthly: number | null;
  seats_included: number | null;
  sort_order: number;
};

// Locked pricing, used when billing_plans can't be read. This is the ACTIVE path today:
// the table's RLS grants SELECT to `authenticated` only, so an anonymous visitor — i.e.
// every ad click — gets zero rows and renders these. They match the live prices. Grant
// anon SELECT on billing_plans and the values below start coming from the DB instead,
// picked up within the revalidate window.
const FALLBACK_TIERS: Tier[] = [
  { plan: 'lite', display_name: 'Lite', price_usd_monthly: 99, seats_included: 5, sort_order: 1 },
  { plan: 'pro', display_name: 'Pro', price_usd_monthly: 179, seats_included: 10, sort_order: 2 },
  { plan: 'max', display_name: 'Max', price_usd_monthly: 299, seats_included: 20, sort_order: 3 },
  { plan: 'enterprise', display_name: 'Enterprise', price_usd_monthly: null, seats_included: null, sort_order: 4 },
];

async function getTiers(): Promise<Tier[]> {
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from('billing_plans')
      .select('plan, display_name, price_usd_monthly, seats_included, sort_order')
      .order('sort_order');
    if (data && data.length) return data as Tier[];
  } catch {
    // table not present yet / RLS blocked — fall through to the locked pricing
  }
  return FALLBACK_TIERS;
}

// Every image below is a real screen from the shipping iOS app — raw screenshots with
// the status bar cropped off, not App Store marketing art and not a mockup. Each one is
// cut by scripts/crop-screenshots.mjs, which prints the w/h to paste in here.

// The public listing. Offered as proof, not as a call to action — see OutboundLink.
const APP_STORE_URL = 'https://apps.apple.com/us/app/refit/id6772761520';

// Five steps, one real screen each, in the order the work happens: tag it, find it,
// read it, order it, hand it over. The boat file is the hero and is not repeated here —
// a tour that shows the same screen twice is just a longer tour.
//
// These render whole. They used to be clipped to a 300px-tall window by `.step .shot img`
// and aimed with a per-step `object-position`, which meant every tile showed a fragment
// and which fragment was decided in a different file from the crop. Both are gone: the
// crop in scripts/crop-screenshots.mjs is now the framing, and the only thing that has to
// agree between the two files is the intrinsic w/h below, which that script prints.
const STEPS = [
  {
    n: '01',
    title: 'The sticker goes on before it comes off',
    body:
      'Photograph the part where it sits and put a QR sticker on it. The photo, the area and the fasteners land on the record there and then. Nothing to type, and it works with no signal.',
    src: '/shots/tag-part-2.webp',
    w: 1206,
    h: 2415,
    alt: 'A ReFitIQ capture: a door hinge photographed in place on the boat with a QR sticker on it, tagged FASTENERS, with its label reading Top hinge, QR setyl.it/3DWQGD and Area House/PH.',
  },
  {
    n: '02',
    title: 'In March, point the camera at it',
    body:
      '“If found please scan” is printed on the sticker. Scan it and the part’s file opens, with the photograph of where it came off and the fasteners it takes. Nobody has to work out which job number it was filed under.',
    src: '/shots/scan-part-2.webp',
    w: 1206,
    h: 2010,
    alt: 'The ReFitIQ scanner aimed at a chrome fitting wearing an “IF FOUND PLEASE SCAN” QR sticker: “Scan to find hardware”, “Point at any captured QR sticker”.',
  },
  {
    n: '03',
    title: 'Every fastener, written down',
    body:
      'Remove and reinstall, or replace. The fasteners are written out in full: 8x, bolt, 12-24, 3/8in, Phillips, 316 stainless. Whoever pulled it can leave a voice note. All of it stays on the part and all of it is searchable.',
    src: '/shots/part-record-2.webp',
    w: 1206,
    h: 2415,
    alt: 'A ReFitIQ part record: disposition set to Remove & reinstall, and a fastener spec reading 8x, bolt, 12-24, 3/8in, flat, Phillips, 316 stainless.',
  },
  {
    n: '04',
    title: '64 to replace, and where every one of them is',
    body:
      'Everything flagged for replacement or refurbishment lands on one list, filtered by to order, ordered and received, with tracking numbers against it. Your parts desk already has the photographs it needs.',
    src: '/shots/order-list-2.webp',
    w: 1206,
    h: 2415,
    alt: 'The ReFitIQ replacement list: To Replace (64), To Refurbish (62), filtered by to order, ordered and received, with Add tracking and Mark received on each row.',
  },
  {
    n: '05',
    title: 'The customer gets a file',
    body:
      'Send out the whole job, or just the 183 items flagged for replacement. Excel, CSV, JSON, PDF or a web report, photos attached. It goes to the share sheet, so you email it or drop it in Files.',
    src: '/shots/export-job-2.webp',
    w: 1206,
    h: 2180,
    alt: 'The ReFitIQ export sheet: 183 items flagged for replacement, exportable as Excel, CSV, JSON, PDF or a web report.',
  },
];

// The three sentences an owner says to the screen before he says yes. All three were
// answerable already — two of them only inside a collapsed FAQ 7,000px down, which is the
// same as not answering them. They now sit in the open, where the thought forms.
const OBJECTIONS = [
  {
    q: '“One more thing for my crew to do.”',
    a: 'Capturing a part is a photograph and a sticker. If you have no stickers the app numbers the bag for you. There is nothing to type. It runs offline below decks and syncs when the phone finds signal. The job at the top of this page is a real one: 458 parts logged that way by the crew who pulled them.',
  },
  {
    q: '“We already have a system.”',
    a: 'Bags and masking tape work. This is the same method with the photographs attached and the counts kept, so it survives the tech who tore the boat down leaving mid-refit. If what you run already does that, you don’t need us.',
  },
  {
    q: '“Too expensive.”',
    a: 'It is $99 to $299 a month for the whole shop, not per photo and not per boat. At $130 an hour that is under one billable hour a month on Lite and under three on Max. The owner or admin seat is free. Extra techs are $15.',
  },
];

// The cost question is FIRST. A skeptic who opens the FAQ at all is a buyer who was
// close, and the answer he finds has to be the one that costs us more, not less. It used
// to be phrased around payment cards ("When do you ask for a card?"), which asks the
// reader to hold the suspicion in his head in order to have it answered.
const FAQ = [
  {
    q: 'What does the trial cost?',
    a: 'Nothing. Fourteen days with every feature switched on and every tech on your crew. You are not billed during it, and you are not billed after it unless you pick a plan. Signing up takes a shop name, a work email and a password.',
  },
  {
    q: 'How many techs can I add during the trial?',
    a: 'All of them. Seats are unlimited for the 14 days, so you never have to pick a plan just to try it properly. Afterwards the owner or admin seat is free on every plan.',
  },
  {
    q: 'Does it work where there is no signal?',
    a: 'Yes. Capture runs offline and syncs when the device is back on a connection, which is the normal case in a shed or below decks.',
  },
  {
    q: 'Do we have to buy QR labels?',
    a: 'No. You can scan a QR or barcode if you already use them, or let ReFitIQ auto-number each bag. Both work the same way afterwards.',
  },
  {
    q: 'Can I control who sees which boat?',
    a: 'Yes. Admins, team leads, techs and parts staff are separate roles, and techs and team leads only see the boats they are assigned to.',
  },
  {
    q: 'What happens to the record if we stop paying?',
    a: 'Nothing is deleted. The shop goes read-only, and you can still open and export every job with the photos attached. The export is a plain file you keep. It opens without ReFitIQ.',
  },
  {
    q: 'How long before the crew is using it?',
    a: 'It is a phone app with a camera and a job list. The first capture takes about a minute. There is no implementation project.',
  },
];

function Shot({
  src,
  alt,
  priority = false,
  w,
  h,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  /**
   * The file's real intrinsic size — REQUIRED, and required per-image on purpose.
   * These crops all differ, and a wrong height makes Next write the wrong
   * aspect-ratio: the browser renders the shot stretched, with no build error and
   * nothing in the console. A default here would be a default that silently lies,
   * so there isn't one. scripts/crop-screenshots.mjs prints the correct pair.
   */
  w: number;
  h: number;
}) {
  return (
    <div className="shot">
      {/* `sizes` has to track `.shot`'s max-width in globals.css: 340px is the cap below
          760px (a 390px phone renders these 338px wide) and 380px is the cap above it.
          Both are stated as flat px rather than as `100vw` on purpose — 100vw is true of
          the column, not of the tile, and it made a DPR-3 phone pull the 1200px
          derivative of the hero for a 338px slot. w/h are per-image: handing the
          1206x2010 scanner the 1206x2415 shape would make Next write the wrong
          aspect-ratio and the browser would render it stretched, with no build error to
          catch it. */}
      <Image
        src={src}
        alt={alt}
        width={w}
        height={h}
        priority={priority}
        sizes="(min-width: 760px) 380px, 340px"
      />
    </div>
  );
}

export default async function Home() {
  const tiers = await getTiers();
  // Enterprise is a conversation, not a self-serve tier, and rendering it as a fourth
  // identical card was the single most template-looking thing on the page: four evenly
  // weighted boxes, one of which cannot be bought. It comes out of the grid and becomes a
  // line of text underneath, which is also what it honestly is.
  const selfServe = tiers.filter((t) => t.plan !== 'enterprise');

  return (
    <>
      <header className="container">
        <nav className="nav">
          <BrandMark lockup="compact" height={26} priority className="nav-brand" />
          <div className="row">
            {/* Demoted to a plain text link on phones rather than removed. 121 of 122
                visitors arrive from paid social with no account, and a nav whose only
                control is a bordered "Sign in" button frames the page as a members'
                portal before a word has been read. Dropping it to a text link costs a
                returning customer nothing — the brand mark is 22px, taller than the
                21px link, so the nav shrinks 62px → 47px either way and the 15px goes
                straight to the screenshot. */}
            <Link href="/login" className="btn btn-ghost nav-signin">
              Sign in
            </Link>
            <CtaLink src="nav" className="btn btn-primary nav-trial">
              Start your free trial
            </CtaLink>
          </div>
        </nav>
      </header>

      <main>
        {/* ── HERO ─────────────────────────────────────────────────────────────────
            Budgeted to 438px so the screenshot's top edge clears the fold with 226px of
            real app screen showing. Running total on a 390px phone:
              nav 47 · section padding 24 · eyebrow 32 · H1 2×40.3+16 · sub 3×25.5+20 ·
              button 49 · note 31 · trust 37 · shot margin 24 · border 1  =  438
            Every line below is sized against that. The H1 must stay under 35 characters
            or it takes a third line and spends 40px of screenshot on itself. */}
        <section className="container hero-split">
          <div className="hero-copy">
            {/* The company's own tagline, set as the eyebrow. It survives the no-lists-of-
                three rule because it is not copy: it is the strapline printed on the
                'long' logo lockup, which the nav crops off. Rewriting it here would put
                the site out of step with the app icon and the App Store listing. */}
            <div className="eyebrow">Track. Tag. Reinstall.</div>
            {/* The owner is not the one at the bulkhead — he is the one paying
                for the hour it takes, twice: once to take the boat apart, and again to
                work out what the first payment bought. It is a claim about his own
                experience, so it needs no proof from us; he supplies it from the last
                refit that ran long. It also still works when the image hasn't painted,
                which matters on cellular inside the Facebook browser. */}
            <h1>You pay for that teardown twice.</h1>
            {/* "An iPhone app" names the category at word two — it used to appear nowhere
                in the first screen, so you could not tell whether this was software, a
                label supplier or a consultancy. "for boatyard owners" puts the audience in
                17px type where it reads at arm's length, and carries no headcount bound:
                "5-20 techs" would disqualify the three-tech shop that is a paying Lite
                customer. It was three short sentences of identical shape, which is the
                rhythm the reader recognises as machine-written; it is now two, of
                different lengths, saying the same thing. It also has to stay under about
                120 characters: a fourth line here costs 25px of screenshot below the fold,
                measured, not computed. (Measured at 390x664: 109, 118 and 123 characters all
                render three lines and leave the screenshot's top edge at 443px, so there was
                no fold cost to fixing the line below.)

                It used to end "so anyone free can put it back". That is a claim about
                scheduling, but it reads as a claim about skill: any spare body can do a
                tradesman's job. The page now has a whole section crediting Philbrook's
                technicians with designing the product, so it cannot also imply their work is
                unskilled. The benefit is the same either way and it is the information that
                moves, not the man. */}
            <p>
              An iPhone app for boatyard owners. Your techs tag every part as it comes off, so
              whoever puts it back has what he needs.
            </p>
            <div className="hero-cta">
              {/* The button says what it does and nothing else. It used to carry a
                  reassurance about payment cards, on the theory that cold social traffic
                  reads "start your free trial" as "enter your details". The reassurance
                  was true, but a primary button that pre-empts an accusation sounds like
                  a site that expects to be distrusted. The offer itself is on the two
                  lines under it. */}
              <CtaLink src="hero">Start your free trial</CtaLink>
            </div>
            {/* A checkable number, not a promise — "All (458)" is printed in the
                screenshot 60px below it, so the highest-read line of micro-copy on the
                page verifies itself. */}
            <div className="hero-note">458 parts off one refit, on the screen below.</div>
            {/* 38 characters, and it has to stay under about 45: the previous line ran 62,
                wrapped to two rows, and cost 50px of fold. "per shop" is deliberately not
                here — it is stated four times further down, and it does not fit. */}
            <div className="hero-trust">
              <span>14 days free, then $99 to $299 a month.</span>
            </div>
          </div>
          <div className="hero-shot">
            {/* A single contiguous extract of one real boat file — never a composite,
                so the caption below stays literally true. The whole screen, top to
                bottom: the vessel number heads it, and the counts the copy cites (64 to
                replace, 458 captured, 82 on the foredeck) sit ~200px into it. Only the
                first band clears the fold on a 390px phone; see the crop's own reasoning
                in scripts/crop-screenshots.mjs for why that band is now the header. */}
            <Shot
              src="/shots/boat-file-3.webp"
              alt="A ReFitIQ boat file mid-refit for Castaway-6469: 64 parts flagged to replace, 458 captures, 82 of them on the foredeck, with areas for flybridge and the rest of the vessel."
              w={1206}
              h={2415}
              priority
            />
            {/* Where a skeptic looks for it: directly under the screen he is being asked
                to believe in. */}
            <div className="shot-caption">Real screens from the app. Not mockups.</div>
            <div className="hero-meta">iPhone. Works below decks with no signal.</div>
          </div>
        </section>

        {/* ── PHILBROOK'S ──────────────────────────────────────────────────────────
            WHY IT SITS HERE, DIRECTLY UNDER THE HERO.

            121 of 122 visitors arrive cold from paid social and 91% bounce, so anything
            below the first screen or two is spent on the minority who already believed.
            This is the most credible fact the product owns, so it goes where the most
            people see it.

            It also finishes the hero's own argument. The hero claims "real screens from
            the app, not mockups", and the reader's next thought is "whose screens?" The
            answer is literally on this screen: Castaway-6469, the boat file at the top of
            this page, is one of Philbrook's jobs (verified against the live database on
            2026-08-14: shop "Philbrooks Boatyard", 461 captures, vessel "Nordhaven 60'").
            Putting the credit under the screenshot makes the screenshot checkable.

            The band is the only one on the page. That is deliberate: it is how a section
            gets to be a section without being turned into another card in a grid.

            THE COPY IS A CREDIT. It says they built it with us and that the shape of the
            product came from their technicians, because that is what happened. It carries
            no disclaimer, and it must not acquire one: a caveat about what they are not,
            attached to a sentence thanking them, reads as talking down on them in the same
            breath. Nothing here claims they sell it, invest in it or endorse it, and
            nothing needs to say so out loud. */}
        <section className="yard-band">
          <div className="container yard">
            <div className="yard-plate">
              {/* Their mark, on its own white ground. It is somebody else's logo, so it
                  does not get inverted, recoloured or keyed out to suit a dark page.
                  Cut by scripts/make-philbrooks-logo.mjs from the app repo's
                  assets/philbrooks-logo.jpeg, which prints the w/h below. */}
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
                ReFitIQ was built at Philbrook&apos;s Boatyard in Sidney, British Columbia, with
                the technicians who use it, on refits their crew was running at the time.
              </p>
              <p>
                They decided what it had to do. What a capture has to hold, and what the record
                needs to say in March when the boat goes back together: that came from the people
                doing the work, while they were doing it.
              </p>
              <p className="yard-close">
                The boat file at the top of this page is one of their jobs. A Nordhavn 60, and 458
                parts logged off it by the crew who pulled them.
              </p>
            </div>
          </div>
        </section>

        {/* The other two credentials. They used to share a grid with the yard, which gave
            a bullet about file formats the same weight as the one real third-party name on
            the site. They keep their words and their styling; they just stopped competing. */}
        <section className="container s-proof">
          <ul className="proof-lines">
            <li>
              <b>It is on the App Store.</b> The listing is public, and the screens on this page
              come out of it.{' '}
              <OutboundLink href={APP_STORE_URL} dest="app-store" className="proof-link">
                See the listing
              </OutboundLink>
            </li>
            <li>
              <b>The record stays yours.</b> Export the whole job with the photos attached,
              whether you keep paying or not. Nothing is deleted if you stop.
            </li>
          </ul>
        </section>

        {/* ── THE PROBLEM ──────────────────────────────────────────────────────────
            Concrete and short: the scene he has personally paid for, in his own calendar
            language. Four lines, not four paragraphs — a man reading this in his own shop is
            scanning for the line that applies to him. Sits tight under the proof block on purpose; the
            uniform 56px between every section was part of what read as generated. */}
        <section className="container s-problem">
          <h2 className="section-head">That boat goes back together in March.</h2>
          <ul className="cost-list">
            <li>The tech who tore it down is on another hull.</li>
            <li>Two techs at an open bulkhead, sorting bags they didn’t fill.</li>
            <li>Fasteners ordered a second time because the first count was never written down.</li>
            <li>A splash date that moves, and a callback you can’t argue from memory.</li>
          </ul>
          <p className="section-sub">
            None of it is logged, so none of it is a line item. It shows up as a job that ran
            three weeks long and a margin you can’t account for. That is payroll, and none of it
            goes on the invoice.
          </p>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
        <section id="how" className="container s-how">
          <h2 className="section-head">Five steps, done at the boat</h2>
          <div className="steps">
            {STEPS.map((s) => (
              <article key={s.n} className="step">
                <div className="step-copy">
                  <div className="step-n">{s.n}</div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
                <Shot src={s.src} alt={s.alt} w={s.w} h={s.h} />
              </article>
            ))}
          </div>
          <div className="mid-cta" data-sticky-stop>
            <CtaLink src="after-how">Start your free trial</CtaLink>
            <span className="mid-cta-note">
              14 days with every feature and every tech on your crew. Cancel anytime.
            </span>
          </div>
        </section>

        {/* ── OBJECTIONS ───────────────────────────────────────────────────────────
            Answered in the open rather than inside a <details> at 7,000px. A collapsed
            answer to an unspoken objection is the same as no answer at all.

            Three matching cards in a repeat(3, 1fr) grid became three rows separated by a
            hairline. Same words, one less identical grid on the page, and the answers get
            a readable measure instead of a third of the width each. */}
        <section className="container s-obj">
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

        {/* ── THE NUMBERS ──────────────────────────────────────────────────────────
            Deliberately AFTER the proof and the product. It also lost two thirds of
            itself on the way here: the old section showed $6,000 of "duplicate orders
            avoided" and $20,000 of "faster turnaround" beside the labour figure and
            totalled them into a $130,000+ banner — two numbers nothing supports, and a
            total 25% larger than what this section's own calculator prints 300px below
            it. A numerate owner discounts the credible figure along with the invented
            ones. One assumption, stated, and it matches the calculator exactly. */}
        <section className="container s-numbers">
          <h2 className="section-head">The part we can count</h2>
          <p className="section-sub">
            Twenty minutes a tech a day, spent looking for something that came off this boat.
            That is the only assumption on this page. Change it below if it is wrong. We have not
            tried to put a number on the callback you couldn’t argue.
          </p>

          <div className="bottomline card">
            <div>
              <div className="bl-k">Labor recovered / year</div>
              <div className="bl-v">$104,000</div>
              <div className="bl-d">10 techs × 20 min/day × 240 days × $130/hr</div>
            </div>
            <div className="bl-x">against</div>
            <div>
              <div className="bl-k">ReFitIQ, 10 techs</div>
              <div className="bl-v">$2,148</div>
              <div className="bl-d">Pro at $179 a month. Two months less billed annually.</div>
            </div>
          </div>

          <h3 className="mini-head">Run your own numbers</h3>
          <RoiCalculator />
          <p className="note">
            These are assumptions. We have no measured customer results to show you. The figure
            is labour only. It leaves out the duplicate orders you stop placing and the slips
            that free up sooner.
          </p>
          <div className="mid-cta" data-sticky-stop>
            <CtaLink src="after-roi">Start your free trial</CtaLink>
            <span className="mid-cta-note">
              14 days, every feature, and every tech on your crew. Cancel anytime.
            </span>
          </div>
        </section>

        {/* ── WHO IT'S FOR ─────────────────────────────────────────────────────── */}
        <section className="container s-who">
          <h2 className="section-head">Shops where boats come apart</h2>
          <ul className="feature-list trust-list">
            <li>
              <b>Refit and repower yards.</b> Teardowns that run for months and change hands
              between techs.
            </li>
            <li>
              <b>Service departments.</b> The same boat comes back next season and the last
              job on it is a year old.
            </li>
            <li>
              <b>Yards whose customers ask for proof.</b> The owner or the surveyor gets a file
              with the photographs in it.
            </li>
            <li>
              <b>Shops that need it locked down.</b> Admins, team leads, techs and parts staff
              are separate roles, each assigned to the boats they work.
            </li>
          </ul>
        </section>

        {/* ── PRICING ──────────────────────────────────────────────────────────── */}
        <section className="container s-pricing">
          <h2 className="section-head">One price for the whole shop</h2>
          <p className="section-sub">
            Every plan starts with the same 14 days free, and every tech on your crew is
            included. Seats are unlimited until you pick a plan.
          </p>
          <div className="pricing">
            {selfServe.map((t) => (
              <div key={t.plan} className={`card tier${t.plan === 'pro' ? ' tier-featured' : ''}`}>
                {t.plan === 'pro' && <div className="tier-flag">Most shops</div>}
                <div className="tier-name">{t.display_name}</div>
                <div className="tier-price">
                  {t.price_usd_monthly != null ? (
                    <>
                      ${t.price_usd_monthly}
                      <small>/mo</small>
                    </>
                  ) : (
                    'Custom'
                  )}
                </div>
                <div className="tier-seats">
                  {t.seats_included != null ? `${t.seats_included} techs included` : 'Custom seats'}
                </div>
                <div style={{ marginTop: 18 }}>
                  <CtaLink
                    src={`pricing-${t.plan}`}
                    className={`btn btn-block ${t.plan === 'pro' ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    Start your free trial
                  </CtaLink>
                </div>
              </div>
            ))}
          </div>
          {/* Enterprise, out of the grid. "Contact us" used to land on the signup form,
              which is not what it says it does. */}
          <p className="tier-enterprise">
            More than 20 techs, or more than one location. Email{' '}
            <a href="mailto:support@refit-iq.com?subject=ReFitIQ%20Enterprise%20enquiry">
              support@refit-iq.com
            </a>{' '}
            and we will price it.
          </p>
          <p className="note">
            Annual billing is two months free and add-on seats are $15 a tech. The owner or admin
            seat is free and doesn’t use one of your paid seats.
          </p>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
        <section className="container s-faq">
          <div className="section-label">Questions</div>
          <div className="faq">
            {FAQ.map((f, i) => (
              // The cost question is open on arrival. What the trial takes from him is the
              // single most common reason a cold visitor doesn't tap, and it used to be
              // both collapsed and wrong.
              <details key={f.q} className="faq-item" open={i === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── CLOSING CTA ──────────────────────────────────────────────────────────
            One button. The "Sign in" that used to sit beside it was a competing tap at
            the exact moment of the decision, on traffic that is entirely cold. It is
            still in the nav and the footer for the people who do have an account.
            This is the one block on the page that is still centred, and it is the only
            one that should be. */}
        <section className="container s-closer">
          <div className="closer card" data-sticky-stop>
            <h2>Start on your next teardown.</h2>
            <p>
              Fourteen days with every feature and every tech on your crew. You are not billed
              until you pick a plan, and if you never pick one, nothing is deleted. The shop goes
              read-only and you can still export every job with the photos attached, as a file
              that opens without us.
            </p>
            <div className="row hero-cta">
              <CtaLink src="closer">Start your free trial</CtaLink>
            </div>
            <p className="closer-note">
              Signing up takes a shop name, a work email and a password. About a minute.
            </p>
          </div>
        </section>
      </main>

      <StickyCta />

      <footer className="footer">
        <div className="container">
          <div className="footer-links">
            <Link href="/getting-started">Getting started</Link>
            <Link href="/login">Sign in</Link>
            <Link href="/signup?src=footer">Start your free trial</Link>
            <a href="mailto:support@refit-iq.com">support@refit-iq.com</a>
          </div>
          <div>© {new Date().getFullYear()} ReFitIQ · refit-iq.com</div>
        </div>
      </footer>
    </>
  );
}
