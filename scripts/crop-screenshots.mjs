// Turn the App Store marketing PNGs into the landing page's device shots.
//
// The App Store assets are marketing art, not screenshots: each one has a baked-in
// headline, an orange rule under it, and a *drawn* phone frame sitting on a gradient.
// Dropping those straight onto the web page would duplicate the headline (the page has
// its own) and put a second frame around an image that already has one — so this script
// finds the drawn phone and crops to the screen inside it.
//
// Usage:
//   npm i -D sharp
//   node scripts/crop-screenshots.mjs [--src <dir>] [--out <dir>] [--dry-run]
//
// Defaults read from ~/Downloads and write to public/shots.
//
// Two things that are easy to get wrong if you rewrite this:
//   * The frame's top edge is found by requiring a bright run spanning most of the
//     device width. A naive "first bright pixel" scan latches onto the short orange rule
//     under the headline instead.
//   * That top edge moves ~60px between images because the headlines wrap to different
//     numbers of lines, so a single hard-coded crop box does not work for all of them.

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const DRY = argv.includes('--dry-run');
const SRC = flag('--src', path.join(os.homedir(), 'Downloads'));
const OUT = flag('--out', path.join(process.cwd(), 'public', 'shots'));

// Source file (refit_screenshot_<n>.png) -> asset name used by app/page.tsx.
//
// Screenshot 1 (the jobs list) is deliberately NOT shipped: it is roughly half empty
// dark space — three boats, the first reading "0 captures / No captures yet" — so it
// renders as a blank slab on the page and reads as an empty account. Re-crop it only if
// it is retaken against a fuller account.
const NAMES = {
  2: 'job-overview',
  3: 'capture-identify',
  4: 'fastener-photo',
  5: 'part-lifecycle',
  6: 'export',
};

const OUT_WIDTH = 860; // ~2x the largest on-page render; next/image derives the rest
const WEBP_QUALITY = 82;
const INSET = 3; // skip the frame's own drawn border so we export screen, not outline

async function frameBox(file) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const lum = (x, y) => {
    const i = (y * W + x) * C;
    return (data[i] + data[i + 1] + data[i + 2]) / 3;
  };

  // Left/right first, sampled from a row well inside the device.
  const yMid = Math.floor(H * 0.6);
  let L = 0;
  let R = W - 1;
  for (let x = 0; x < W; x++) if (lum(x, yMid) > 60) { L = x; break; }
  for (let x = W - 1; x >= 0; x--) if (lum(x, yMid) > 60) { R = x; break; }

  // Top/bottom need a bright run spanning most of the width — see the note up top.
  const need = ((R - L) / 4) * 0.9;
  let T = 0;
  let B = H - 1;
  for (let y = Math.floor(H * 0.12); y < H; y++) {
    let c = 0;
    for (let x = L; x <= R; x += 4) if (lum(x, y) > 50) c++;
    if (c > need) { T = y; break; }
  }
  for (let y = H - 1; y > 0; y--) {
    let c = 0;
    for (let x = L; x <= R; x += 4) if (lum(x, y) > 50) c++;
    if (c > need) { B = y; break; }
  }
  return { left: L, top: T, width: R - L + 1, height: B - T + 1 };
}

if (!DRY) fs.mkdirSync(OUT, { recursive: true });

const results = [];
for (const [n, name] of Object.entries(NAMES)) {
  const file = path.join(SRC, `refit_screenshot_${n}.png`);
  if (!fs.existsSync(file)) {
    console.log(`skip  ${name}: ${file} not found`);
    continue;
  }
  const box = await frameBox(file);
  const crop = {
    left: box.left + INSET,
    top: box.top + INSET,
    width: box.width - INSET * 2,
    height: box.height - INSET * 2,
  };
  const dest = path.join(OUT, `${name}.webp`);
  if (DRY) {
    console.log(`would write ${name}.webp  crop=${JSON.stringify(crop)}`);
    continue;
  }
  const out = await sharp(file)
    .extract(crop)
    .resize(OUT_WIDTH)
    .webp({ quality: WEBP_QUALITY })
    .toFile(dest);
  const kb = (fs.statSync(dest).size / 1024).toFixed(0);
  results.push({ name, w: out.width, h: out.height });
  console.log(`ok    ${name}.webp  ${out.width}x${out.height}  ${kb} KB`);
}

// All shipped tiles must share one aspect ratio, or the page reflows between steps.
if (results.length > 1) {
  const ratios = results.map((r) => (r.h / r.w).toFixed(3));
  const uniq = [...new Set(ratios)];
  console.log(`\naspect ratios: ${uniq.join(', ')}`);
  if (uniq.length > 1) {
    console.log('WARNING: tiles differ in aspect ratio — app/page.tsx assumes 860x1713 for all of them.');
  }
}
