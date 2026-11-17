// make-page-og-images.mjs — one Open Graph card per page of the site (Jon, 17 Nov 2026).
//
// Same idea and palette as scripts/make-og-image.mjs (the home card): a STATIC 1200x630 png
// per route, picked up by Next's file convention as app/(site)/<page>/opengraph-image.png with
// its .alt.txt. Each card carries the page's heading and one screen from the app.
//
// USAGE (from the repo root): node scripts/make-page-og-images.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const W = 1200;
const H = 630;
const BG = '#0e0e10';
const TEXT = '#f5f5f4';
const MUTED = '#a1a1aa';
const ACCENT = '#ff6a2c';
const BORDER = '#2a2a30';
const FONT = "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const PAGES = [
  { dir: 'how-it-works', eyebrow: 'HOW IT WORKS', title: ['From the teardown', 'to the reinstall'], sub: 'Eight screens from a real refit.', shot: '05-part-plan' },
  { dir: 'features', eyebrow: 'FEATURES', title: ['What it does for each', 'person in the shop'], sub: 'Techs, team leads, the parts desk and admins.', shot: '06-fasteners' },
  { dir: 'industries', eyebrow: 'INDUSTRIES', title: ['The teardown is', 'the same job'], sub: 'Marine, automotive and construction.', shot: '02-project' },
  { dir: 'pricing', eyebrow: 'PRICING', title: ['One price for', 'the whole shop'], sub: '$99 to $299 a month. 14 days free.', shot: '08-replacements' },
  { dir: 'about', eyebrow: 'ABOUT', title: ['Built in a', 'working boatyard'], sub: 'With Philbrook’s Boatyard, Sidney BC.', shot: '01-jobs' },
  { dir: 'get-the-app', eyebrow: 'GET THE APP', title: ['ReFitIQ for iPhone', 'and Android'], sub: 'On the App Store and Google Play.', shot: '01-jobs' },
  { dir: 'contact', eyebrow: 'CONTACT', title: ['Contact and', 'support'], sub: 'support@refit-iq.com', shot: '07-history' },
];

const SHOTS = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'how', 'shots.json'), 'utf8'));
const LOGO = path.join(process.cwd(), 'public', 'brand', 'logo-compact.png');
const logoMeta = await sharp(LOGO).metadata();
const LOGO_H = 44;
const logoW = Math.round((logoMeta.width / logoMeta.height) * LOGO_H);
const logo = await sharp(LOGO).resize(logoW, LOGO_H).toBuffer();

for (const p of PAGES) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="0.85" cy="0.2" r="0.7">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="80" y="170" width="6" height="250" rx="3" fill="${ACCENT}"/>
  <text x="112" y="200" font-family="${FONT}" font-size="24" font-weight="600" letter-spacing="3" fill="${MUTED}">${esc(p.eyebrow)}</text>
  <text x="112" y="282" font-family="${FONT}" font-size="58" font-weight="700" letter-spacing="-1" fill="${TEXT}">${esc(p.title[0])}</text>
  <text x="112" y="350" font-family="${FONT}" font-size="58" font-weight="700" letter-spacing="-1" fill="${TEXT}">${esc(p.title[1])}</text>
  <text x="112" y="412" font-family="${FONT}" font-size="28" fill="${MUTED}">${esc(p.sub)}</text>
  <rect x="80" y="516" width="700" height="1" fill="${BORDER}"/>
  <text x="80" y="566" font-family="${FONT}" font-size="28" font-weight="600" fill="${TEXT}">refit-iq.com</text>
</svg>`;
  // One screen from the app on the right, in a dark phone outline.
  const shotH = 560;
  // The shot's 2x file, whatever its width (02 is 721px since its 17 Nov recapture).
  const w2 = SHOTS.find((m) => m.name === p.shot).w2;
  const shot = await sharp(path.join(process.cwd(), 'public', 'how', `${p.shot}-${w2}.webp`))
    .resize({ height: shotH - 20 })
    .toBuffer();
  const sm = await sharp(shot).metadata();
  const frame = await sharp({
    create: { width: sm.width + 20, height: shotH, channels: 4, background: '#050506' },
  })
    .composite([{ input: shot, left: 10, top: 10 }])
    .png()
    .toBuffer();
  const out = path.join(process.cwd(), 'app', '(site)', p.dir, 'opengraph-image.png');
  await sharp(Buffer.from(svg))
    .composite([
      { input: logo, left: 80, top: 70 },
      { input: frame, left: W - 80 - (sm.width + 20), top: 35 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(out);
  fs.writeFileSync(path.join(process.cwd(), 'app', '(site)', p.dir, 'opengraph-image.alt.txt'), `ReFitIQ: ${p.title.join(' ')}. ${p.sub}`);
  console.log('wrote', path.relative(process.cwd(), out));
}
