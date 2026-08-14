// Cuts the web asset for the Philbrook's Boatyard credit on the landing page.
//
// Source is the app repo's assets/philbrooks-logo.jpeg — black type and a red keyline on
// a white ground, 612x268 with a wide uneven margin baked into the file. Two things have
// to happen before it can sit on a page:
//
//   1. TRIM the white. The margin in the source is not symmetrical, so laying the raw
//      file into a box makes the mark look badly centred and nobody can tell why.
//   2. KEEP IT ON WHITE. The site is #0e0e10 and this is somebody else's mark — we do not
//      get to invert it, recolour it or key the ground out. It goes on a white plate in
//      the page, which is also how it appears on their own signage.
//
// Run: node scripts/make-philbrooks-logo.mjs
// Output: public/brand/philbrooks.png (and the w/h to paste into app/page.tsx).

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = path.resolve(
  process.argv[2] ?? 'C:/Users/chase/projects/hardware-memory/assets/philbrooks-logo.jpeg',
);
const OUT = path.resolve(process.cwd(), 'public', 'brand', 'philbrooks.png');

// 2x the ~230px slot the page gives it, so it stays sharp on a DPR-3 phone.
const TARGET_W = 460;

if (!fs.existsSync(SRC)) {
  console.error(`Source not found: ${SRC}`);
  process.exit(1);
}

const img = sharp(SRC);
const meta = await img.metadata();

const out = await img
  // threshold 12, not 0: the JPEG's "white" is 250-255, not 255, so an exact-match trim
  // takes nothing off.
  .trim({ background: '#ffffff', threshold: 12 })
  .resize({ width: TARGET_W, withoutEnlargement: false, fit: 'inside' })
  // Flatten onto white so the PNG has no alpha to composite against the dark page —
  // whatever it sits on, the mark keeps its own ground.
  .flatten({ background: '#ffffff' })
  .png({ compressionLevel: 9 })
  .toBuffer({ resolveWithObject: true });

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out.data);

console.log(`source  ${meta.width}x${meta.height}  ${SRC}`);
console.log(`written ${out.info.width}x${out.info.height}  ${OUT}  (${Math.round(out.data.length / 1024)} KB)`);
console.log(`\nPaste into <Image>:  width={${out.info.width}} height={${out.info.height}}`);
