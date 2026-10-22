// make-join-og-image.mjs — generates app/join/[code]/opengraph-image.png (1200x630), the card
// a messaging app shows for an INVITE link.
//
// Jon, 2026-10-22: "a person opening an invite link currently sees Start free trial". Part of
// that was this card: /join/<code> inherited the site's own (app/opengraph-image.png), which
// says "FOR SHOP OWNERS" and "14 days free. Cancel anytime." A tech being asked to join his
// shop's crew was being pitched a trial. Next's file convention gives the /join segment its
// own image; the page's generateMetadata puts the shop's NAME in the card's title, which a
// static image cannot.
//
// Same palette, logo and layout as make-og-image.mjs, so the two read as one brand. No trial,
// no price, no plan: joining a shop costs the person joining nothing and asks nothing of them.
//
// USAGE (from the repo root): node scripts/make-join-og-image.mjs [--out <file>] [--dry-run]

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const W = 1200;
const H = 630;

// Kept in sync with :root in app/globals.css (and make-og-image.mjs).
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
const OUT = path.resolve(flag('--out', path.join(process.cwd(), 'app', 'join', '[code]', 'opengraph-image.png')));
const DRY = args.includes('--dry-run');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const FONT = "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
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
  <rect x="88" y="150" width="6" height="300" rx="3" fill="${ACCENT}"/>

  <g transform="translate(128, 0)">
    <text x="0" y="196" font-family="${FONT}" font-size="26" font-weight="600"
          letter-spacing="3.4" fill="${MUTED}">${esc("YOU'RE INVITED")}</text>
    <text x="0" y="382" font-family="${FONT}" font-size="52" font-weight="700"
          letter-spacing="-1" fill="${TEXT}">${esc('Join your shop on ReFitIQ.')}</text>
    <text x="0" y="438" font-family="${FONT}" font-size="30" font-weight="400"
          fill="${MUTED}">${esc('Make your account from the link your admin sent.')}</text>
    <text x="0" y="480" font-family="${FONT}" font-size="30" font-weight="400"
          fill="${MUTED}">${esc('Once they let you in, sign in to the app.')}</text>
  </g>

  <rect x="88" y="516" width="1024" height="1" fill="${BORDER}"/>
  <text x="88" y="566" font-family="${FONT}" font-size="28" font-weight="600"
        fill="${TEXT}">refit-iq.com</text>
  <rect x="88" y="596" width="360" height="4" rx="2" fill="url(#rule)"/>
</svg>`;

if (DRY) {
  console.log(`dry-run: would write ${OUT} (${W}x${H})`);
  console.log(svg);
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });

const LOGO = path.join(process.cwd(), 'public', 'brand', 'logo-long.png');
const LOGO_H = 96;
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
