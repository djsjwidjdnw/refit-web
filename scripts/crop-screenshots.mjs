// Turn raw iPhone screenshots into the landing page's device shots.
//
// Usage (from the repo root):
//   node scripts/crop-screenshots.mjs [--src <dir>] [--out <dir>] [--dry-run] [--only <name>]
//
// Defaults read from ~/Downloads and write to public/shots.
//
// WHAT CHANGED, AND WHY
// This script used to take the App Store *marketing* PNGs — headline baked in, orange
// rule, a drawn phone frame on a gradient — and hunt for the frame's edges so it could
// export the screen inside it. Those assets showed the pre-drawer UI and the old "ReFit"
// wordmark, so every shot they produced has been replaced. The sources are now plain
// screenshots straight off the device, which means there is no frame to find: the only
// furniture to remove is the iOS status bar at the top and the home indicator at the
// bottom, and both sit at known offsets.
//
// Two things that are easy to get wrong if you rewrite this:
//   * The crop for each asset is NOT "the whole screen". Each tile is rendered into a
//     298px-wide slot and, for the tour steps, clipped to a 300px-tall window by
//     `.step .shot img` in globals.css. So the crop's job is to frame the part of the
//     screen the copy beside it actually talks about. The run reports whether a crop
//     fits that window; if it does not, page.tsx must aim it with `pos`.
//   * IMG_3526 is a full-bleed camera view with NO status bar — its content starts at
//     row 0. Cropping 132px off the top of that one silently eats the viewfinder.
//
// Every crop is a single contiguous `extract`. Nothing is stitched or composited, so the
// page's "Real screens from the app. Not mockups." caption stays literally true.

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
const ONLY = flag('--only', null);
const SRC = flag('--src', path.join(os.homedir(), 'Downloads'));
const OUT = flag('--out', path.join(process.cwd(), 'public', 'shots'));

const OUT_WIDTH = 860; // ~2x the largest on-page render; next/image derives the rest
const WEBP_QUALITY = 82;

// Source screenshots are 1206x2622 (iPhone 16 Pro @3x).
//   STATUS_BAR — clock/signal/battery band. Content resumes cleanly at 132.
//   HOME_BAR   — the white pill. Starts ~2580; stop short of it.
const STATUS_BAR = 132;
const HOME_BAR = 2565;

// One entry per shipped tile. `top`/`bottom` are rows in the SOURCE image.
//
// The numbers are deliberate, not "the whole screen minus chrome" — see the note above.
// Where a crop is taller than the 300px step window, page.tsx carries a matching `pos`
// (object-position) so the window lands on the right part; those are called out here so
// the two files can be kept in step.
const SHOTS = [
  {
    // NOT 'hero-job' — that name already shipped with different pixels behind it, and
    // both Next's optimiser and Vercel's CDN key their cache on the source URL. Reusing
    // the path served the OLD screenshot from cache against the NEW copy, so the page
    // claimed 458 parts beside an image reading 417. Renaming is the cache bust; any
    // future re-crop of this tile needs a new name too.
    name: 'boat-file',
    src: 'IMG_3532.PNG',
    // The boat file for Castaway-6469, framed on the counts rather than on the title.
    // Only ~220px of this clears the fold on a 390px phone, so that band has to carry
    // the whole argument: starting here it holds "Replace (64)", "All (458)" and
    // "Foredeck/Boat deck (82)" with "Flybridge" alongside. Starting 130px higher wins
    // the vessel name and loses every count, which is the worse trade — a hull number
    // can be misread as a part number, whereas foredeck and flybridge cannot be misread
    // as anything but a boat.
    // Runs to 1900 so the asset ends inside the capture rows and the fold cuts through
    // the scan chips: both edges land mid-content, which reads as a screen that
    // continues rather than a shell that stops.
    top: 430,
    bottom: 1900,
    note: 'hero — renders whole, no pos',
  },
  {
    name: 'tag-part',
    src: 'IMG_3524.PNG',
    // The hinge in situ with the QR sticker already on it. Cropped to the search/Scan
    // bar plus the photo, and no further: including the label block below it made the
    // asset 1575 rows, of which the 300px window could only ever show a bit over half,
    // so most of the file was weight the page downloaded and never displayed.
    top: 380,
    bottom: 1760,
    note: 'step 01 — pos 50% 50%',
  },
  {
    name: 'scan-part',
    src: 'IMG_3526.PNG',
    // Full-bleed camera: NO status bar, content starts at row 0. Cropped so the
    // "Scan to find hardware" pill, the viewfinder and the sticker all fit the 300px
    // window at once — this is the most instantly readable image on the page and it
    // should not need aiming.
    top: 250,
    bottom: 1465,
    note: 'step 02 — fits the window whole',
  },
  {
    name: 'part-record',
    src: 'IMG_3525.PNG',
    // Disposition through the fastener spec line. The spec line is the payload:
    // "8x · Bolt · 12-24 · 3/8in · Flat · Phillips · 316 Stainless · Replace".
    top: 600,
    bottom: 1930,
    note: 'step 03 — pos aims at FASTENERS',
  },
  {
    name: 'order-list',
    src: 'IMG_3530.PNG',
    // To Replace (64) / To Refurbish (62) down through a Received row and an Ordered
    // row with its Add tracking / Mark received buttons — the procurement pipeline.
    top: 500,
    bottom: 1720,
    note: 'step 04 — fits the window whole',
  },
  {
    name: 'export-job',
    src: 'IMG_3529.PNG',
    // The export sheet. Tuned so BOTH ends survive the 300px window: the
    // "183 items flagged for replacement" count at the top (the proof) and
    // "Web report (.html)" at the bottom (a format the page has never mentioned).
    // The span between them is 886 output rows against a 866-row window, so this
    // clips ~5px off each end and nothing legible is lost.
    top: 700,
    bottom: 1960,
    note: 'step 05 — pos 50% 50%',
  },
];

if (!DRY) fs.mkdirSync(OUT, { recursive: true });

// A 298px-wide render clipped to a 300px-tall window shows this many rows of an
// OUT_WIDTH-wide asset. Used only to report whether a tile needs aiming.
const WINDOW_ROWS = Math.round(300 * (OUT_WIDTH / 298));

const results = [];
for (const shot of SHOTS) {
  if (ONLY && shot.name !== ONLY) continue;
  const file = path.join(SRC, shot.src);
  if (!fs.existsSync(file)) {
    console.log(`skip  ${shot.name}: ${file} not found`);
    continue;
  }
  const meta = await sharp(file).metadata();
  const top = shot.top;
  const height = Math.min(shot.bottom, HOME_BAR, meta.height) - top;
  if (height <= 0) {
    console.error(`FAIL  ${shot.name}: empty crop`);
    process.exitCode = 1;
    continue;
  }

  const dest = path.join(OUT, `${shot.name}.webp`);
  const outH = Math.round(height * (OUT_WIDTH / meta.width));
  if (DRY) {
    console.log(
      `would write ${shot.name}.webp  from ${shot.src} rows ${top}-${top + height}  -> ${OUT_WIDTH}x${outH}`,
    );
    continue;
  }

  const out = await sharp(file)
    .extract({ left: 0, top, width: meta.width, height })
    .resize(OUT_WIDTH)
    .webp({ quality: WEBP_QUALITY })
    .toFile(dest);

  const kb = (fs.statSync(dest).size / 1024).toFixed(0);
  const fits = out.height <= WINDOW_ROWS ? 'fits window' : `needs pos (${out.height} > ${WINDOW_ROWS})`;
  results.push({ name: shot.name, w: out.width, h: out.height });
  console.log(
    `ok    ${shot.name}.webp  ${out.width}x${out.height}  ${kb} KB  [${shot.src} ${top}-${top + height}]  ${fits}`,
  );
}

// Tiles no longer have to share an aspect ratio — Shot in app/page.tsx takes per-image
// w/h. But page.tsx has to be told the right ones: handing an 860x998 file the 860x1713
// default makes Next write the wrong aspect-ratio and the browser renders it stretched,
// with no build error. Print them so they can be copied across.
if (results.length) {
  console.log('\nintrinsic sizes for app/page.tsx (w/h props):');
  for (const r of results) console.log(`  ${r.name.padEnd(12)} w={${r.w}} h={${r.h}}`);
}
