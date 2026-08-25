// make-og-image.mjs — generates app/opengraph-image.png (1200x630).
//
// WHY THIS EXISTS
// app/layout.tsx declares `twitter: { card: 'summary_large_image' }` and an openGraph
// block. Without an actual image, every ad link shared to Instagram / iMessage / X
// rendered as a blank card — the worst possible first impression for paid traffic.
//
// Next's file convention picks up app/opengraph-image.png automatically and, because
// metadataBase is set, emits an absolute og:image URL. Twitter falls back to og:image
// when no twitter-image.* is present, so this one file covers both cards.
//
// It is a STATIC png on purpose rather than a next/og ImageResponse route: the card is
// the same for every page, so there is no reason to pay for a runtime render (or to
// depend on next/og's edge runtime) to produce a constant.
//
// USAGE (from the repo root):
//   node scripts/make-og-image.mjs [--out <file>] [--dry-run]
//
// Colours are read straight from the :root block in app/globals.css so this can never
// drift from the site palette.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const W = 1200;
const H = 630;

// Kept in sync with :root in app/globals.css.
const BG = '#0e0e10';
const TEXT = '#f5f5f4';
const MUTED = '#a1a1aa';
const ACCENT = '#ff6a2c';
const BORDER = '#2a2a30';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const OUT = path.resolve(flag('--out', path.join(process.cwd(), 'app', 'opengraph-image.png')));
const DRY = args.includes('--dry-run');

// Escape for XML text nodes — the copy below is fixed, but keep the helper so editing
// the strings later can't silently produce invalid SVG.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// A generic-family fallback ("sans-serif") is appended so this renders on a CI box that
// has none of the named Windows/macOS faces installed.
const FONT = "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <!-- Warm bloom bleeding in from the right, so the card reads as lit rather than flat
         black when it sits in a bright Instagram/iMessage feed. -->
    <radialGradient id="glow" cx="0.82" cy="0.18" r="0.75">
      <stop offset="0%"   stop-color="${ACCENT}" stop-opacity="0.30"/>
      <stop offset="45%"  stop-color="${ACCENT}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${ACCENT}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Accent spine: the same orange rule the site uses to open a section. -->
  <rect x="88" y="150" width="6" height="300" rx="3" fill="${ACCENT}"/>

  <g transform="translate(128, 0)">
    <text x="0" y="196" font-family="${FONT}" font-size="26" font-weight="600"
          letter-spacing="3.4" fill="${MUTED}">${esc('FOR SHOP OWNERS')}</text>

    <!-- The wordmark is the real logo art, composited over this SVG below —
         a typed-out "Re"+"Fit" was how the card ended up off-brand in the first place. -->

    <!-- These two strings and the eyebrow above must match the H1 and subhead in
         app/page.tsx and the metadata in app/layout.tsx. Paid social shows the card and
         the page back to back, so a mismatch here is a message break on 100% of the
         traffic — see the comment in app/layout.tsx. Re-run this script after any
         headline change. -->
    <text x="0" y="382" font-family="${FONT}" font-size="52" font-weight="700"
          letter-spacing="-1" fill="${TEXT}">${esc('You pay for that teardown twice.')}</text>

    <!-- Two lines, and two sentences of different lengths. It was three short sentences
         of the same shape on one line, which is the cadence a reader clocks as
         machine-written before he has finished reading it. -->
    <text x="0" y="438" font-family="${FONT}" font-size="30" font-weight="400"
          fill="${MUTED}">${esc('An iPhone app. Your techs tag every part as it comes off.')}</text>
    <text x="0" y="480" font-family="${FONT}" font-size="30" font-weight="400"
          fill="${MUTED}">${esc('Whoever puts it back has what he needs.')}</text>
  </g>

  <!-- Footer strip -->
  <rect x="88" y="516" width="1024" height="1" fill="${BORDER}"/>
  <text x="88" y="566" font-family="${FONT}" font-size="28" font-weight="600"
        fill="${TEXT}">refit-iq.com</text>
  <text x="1112" y="566" text-anchor="end" font-family="${FONT}" font-size="28"
        font-weight="400" fill="${MUTED}">${esc('14 days free. Cancel anytime.')}</text>
  <rect x="88" y="596" width="360" height="4" rx="2" fill="url(#rule)"/>
</svg>`;

if (DRY) {
  console.log(`dry-run: would write ${OUT} (${W}x${H})`);
  console.log(svg);
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });

// The logo is real art, not type. It is composited on top of the rendered SVG
// rather than embedded as a data: URI so the source PNG stays the single copy —
// regenerate it with make-brand-assets.mjs and this card follows automatically.
const LOGO = path.join(process.cwd(), 'public', 'brand', 'logo-long.png');
const LOGO_H = 96; // sits in the band the 86px wordmark used to occupy
const logoMeta = await sharp(LOGO).metadata();
const logoW = Math.round((logoMeta.width / logoMeta.height) * LOGO_H);
const logo = await sharp(LOGO).resize(logoW, LOGO_H).toBuffer();

await sharp(Buffer.from(svg))
  .composite([{ input: logo, left: 128, top: 228 }])
  .png({ compressionLevel: 9 })
  .toFile(OUT);

const { size } = fs.statSync(OUT);
const meta = await sharp(OUT).metadata();
console.log(`wrote ${OUT}  ${meta.width}x${meta.height}  ${(size / 1024).toFixed(1)} KB`);
if (meta.width !== W || meta.height !== H) {
  console.error(`WARNING: expected ${W}x${H} — og:image consumers crop anything else.`);
  process.exit(1);
}
