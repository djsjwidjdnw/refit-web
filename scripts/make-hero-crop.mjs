// make-hero-crop.mjs — derives public/shots/hero-job.webp from public/shots/job-overview.webp.
//
// WHY THIS EXISTS
// The hero screenshot only ever shows the band that clears the fold. At 390px that band is
// ~226px of a 300px-wide slot, i.e. the top ~650 source rows of a 1713px-tall screen — and
// on job-overview.webp those rows are pure chrome: a title bar, two tab buttons and a
// search field. The reader is asked to believe "real screens from the app" while looking
// at furniture.
//
// This crops to the part of that same screen that carries the payload — the vessel card,
// the flagged-for-replacement banner and the three stat tiles — so the pixels above the
// fold are the ones that prove a real refit.
//
// It is a single contiguous extract. Nothing is stitched, composited or re-ordered, so the
// page's "Real screens from the app. Not mockups." caption stays literally true.
//
// Usage (from the repo root):
//   node scripts/make-hero-crop.mjs [--dry-run]

import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';

const SRC = path.join(process.cwd(), 'public', 'shots', 'job-overview.webp');
const OUT = path.join(process.cwd(), 'public', 'shots', 'hero-job.webp');
const DRY = process.argv.includes('--dry-run');

// Source rows to keep. TOP is chosen so the Nordhaven 60' job card starts just inside the
// frame; HEIGHT runs past the stat tiles into the green install bar so the fold cuts
// through content rather than landing on the asset's bottom edge — an image that ends
// exactly at the fold reads as a shell that stops, not as a screen that continues.
const TOP = 700;
const HEIGHT = 1000;

const meta = await sharp(SRC).metadata();
if (TOP + HEIGHT > meta.height) {
  console.error(`crop exceeds source: ${TOP}+${HEIGHT} > ${meta.height}`);
  process.exit(1);
}

if (DRY) {
  console.log(`dry-run: ${SRC} ${meta.width}x${meta.height} -> ${OUT} ${meta.width}x${HEIGHT} (rows ${TOP}-${TOP + HEIGHT})`);
  process.exit(0);
}

await sharp(SRC)
  .extract({ left: 0, top: TOP, width: meta.width, height: HEIGHT })
  .webp({ quality: 82 })
  .toFile(OUT);

const { size } = fs.statSync(OUT);
const out = await sharp(OUT).metadata();
console.log(`wrote ${OUT}  ${out.width}x${out.height}  ${(size / 1024).toFixed(1)} KB  (source rows ${TOP}-${TOP + HEIGHT})`);
