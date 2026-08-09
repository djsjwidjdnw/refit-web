// Turn raw iPhone screenshots into the landing page's device shots.
//
// Usage (from the repo root):
//   node scripts/crop-screenshots.mjs [--src <dir>] [--out <dir>] [--dry-run] [--only <name>]
//
// Defaults read from ~/Downloads and write to public/shots.
//
// WHAT CHANGED, AND WHY
// Two rewrites are folded into this file.
//
// The first replaced the App Store *marketing* PNGs — headline baked in, orange rule, a
// drawn phone frame on a gradient — with plain screenshots straight off the device. That
// removed the frame-hunting: the only furniture to strip is the iOS status bar at the top
// and the home indicator at the bottom, and both sit at known offsets.
//
// The second is this one, and it inverted the rule the crops were cut by. They used to be
// aimed: each tile rendered into a 298px-wide slot that CSS then clipped to a 300px-tall
// window, so a crop's job was to put one payload — a spec line, a count — inside that
// window, and page.tsx carried an `object-position` per shot to aim it. That produced six
// tight fragments. Half of each screen was cut off, and which half depended on a number
// kept in a different file.
//
// The window is gone (`.step .shot img` no longer pins a height), so a crop is now WHAT
// THE READER SEES, whole, and there is nothing to keep in step in page.tsx beyond the
// intrinsic w/h this script prints. That makes the rule simple: take the WHOLE screen
// between the status bar and the home indicator, and stop early only where the screen
// itself stops (the export sheet ends at Cancel; the scanner's lower third is bare deck)
// or where carrying on would put a real person's name on a public page.
//
// Two things that are easy to get wrong if you rewrite this:
//   * IMG_3526 is a full-bleed camera view with NO status bar — its content starts at
//     row 0. Cropping 150px off the top of that one silently eats the viewfinder.
//   * The tiles are ~340px wide on a phone and ~380px on a desktop, i.e. the screen is
//     shown at roughly a third of its captured size. Anything the copy beside it points
//     at has to survive that reduction, which is why the crops are not trimmed tighter
//     to save height — a smaller crop shown at the same width is not more legible, it is
//     just less screen.
//
// Every crop is a single contiguous `extract`. Nothing is stitched or composited except
// the name chips below, so the page's "Real screens from the app. Not mockups." caption
// stays literally true.

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

// Native width of the source screenshots: these are written 1:1, not downscaled. The old
// 860 was ~2x the largest on-page render back when that render was 298px wide; at 380px
// on a desktop and DPR 3 the browser now asks for 1140, and next/image can only serve
// what the source has. Keeping the native pixels also makes the cover coordinates below
// readable — output space and screenshot space are the same space. next/image still
// derives every delivered size from this, so the wire cost is unchanged.
const OUT_WIDTH = 1206;
const WEBP_QUALITY = 82;

// Source screenshots are 1206x2622 (iPhone 16 Pro @3x).
//   STATUS_BAR — clock/signal/battery band. The battery pill's last row is ~122, so 150
//                clears it with margin and lands in the gap above the app's own nav row.
//   HOME_BAR   — the white pill. Starts ~2580; stop short of it.
const STATUS_BAR = 150;
const HOME_BAR = 2565;

// The orange the app itself fills its chips with, sampled straight out of the "All (458)"
// pill in IMG_3532 rather than taken from the site palette. The site accent is #ff6a2c and
// the brand orange is #f26f21; using either would put a subtly wrong orange inside a real
// screenshot, which is exactly the kind of thing that reads as "edited" without the viewer
// being able to say why.
const APP_ORANGE = '#FF8D42';
// Dark ink on orange, matching how the app sets text inside a filled chip.
const APP_ORANGE_INK = '#1a1206';

// An opaque rounded chip composited over a crop.
//
// This exists to keep real people's names off a public marketing page. It is deliberately
// NOT a grey/black redaction bar and deliberately NOT a fake UI label: a bar reads as
// censorship, and inventing a plausible-looking value (a role, a different name) would put
// invented data inside an image the page captions "Real screens from the app. Not
// mockups.". A filled chip in the app's own orange with "•••" in it matches the chip
// styling already on screen, and claims nothing.
//
// Coordinates are given in SOURCE pixels — i.e. the rows and columns you read off the
// screenshot itself — and mapped through the crop below. The previous version took them
// in output space, which silently invalidated every one of them the moment a crop's `top`
// moved, and a crop's `top` is the thing most likely to move.
function coverChip({ x, y, w, h }) {
  const fontSize = Math.round(h * 0.76);
  return {
    left: x,
    top: y,
    input: Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
        `<rect width="${w}" height="${h}" rx="${h / 2}" fill="${APP_ORANGE}"/>` +
        `<text x="${w / 2}" y="${h / 2 + fontSize * 0.38}" text-anchor="middle" ` +
        `font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="${fontSize}" ` +
        `font-weight="800" fill="${APP_ORANGE_INK}">•••</text>` +
        `</svg>`,
    ),
  };
}

// Every "Captured by <name>" row in IMG_3532 puts the name in the same column, because
// the label in front of it is the same string every time. Measured off the screenshot by
// ink profile rather than by eye — an earlier pass eyeballed it and shaved the first
// glyph's left edge, which put a legible letter beside the chip:
//   "Captured" 353-493   "by" 509-541   name 555-721   text 30px tall
// One chip geometry therefore covers all of them and only the row changes. 549 starts it
// 8px clear of "by" (butted straight against the label it reads as a collision) and 6px
// clear of the first glyph; 186 wide overhangs the longest of the three names by 14px.
// The 48px height is the app's own chip proportion for 30px text.
const NAME_CHIP = { x: 549, w: 186, h: 48 };
const nameAt = (midline) => ({ ...NAME_CHIP, y: Math.round(midline - NAME_CHIP.h / 2) });

// One entry per shipped tile. `top`/`bottom` are rows in the SOURCE image.
const SHOTS = [
  {
    // The trailing number is a cache generation, and it MUST be bumped every time the
    // pixels behind this name change. Next's optimiser and Vercel's CDN both key on the
    // source URL, so re-cutting a tile in place serves the OLD picture from cache against
    // the NEW copy — that has already happened once here, with the page claiming 458 parts
    // beside a screenshot reading 417. '-3' is this recut; '-2' covered the technician
    // name; '-1' would have been plain 'boat-file'.
    name: 'boat-file-3',
    src: 'IMG_3532.PNG',
    // The whole boat file for Castaway-6469, top to bottom: the vessel number, the
    // Replace (64) / Refurbish row, Decommission, Assign a task, both chip rails
    // (All (458), Foredeck/Boat deck (82), Flybridge; All scans (458), My scans (133),
    // Urgent (20)), the search field and three real capture rows.
    //
    // The old cut started at 430 to buy the counts a place above a 390px phone's fold,
    // and paid for it with the vessel name and the whole header. Read at 340px wide the
    // header now costs about 90px of fold and returns the one thing that says "this is a
    // boat, in a yard, with a number" before the reader has scrolled: Castaway-6469, with
    // Replace (64) directly under it. Everything the hero copy cites — "458 parts off one
    // refit" — is still on the same image, 200px lower.
    //
    // Ends at the home bar, which cuts mid-way through the third capture row: both edges
    // land in content, which reads as a screen that continues rather than a shell.
    top: STATUS_BAR,
    bottom: HOME_BAR,
    // Three capture rows survive this crop and all three are credited to a real
    // technician by name, on a public ad landing page. The chips cover the NAMES only:
    // the "Captured by" label stays on each row, so the screen still demonstrates that
    // every capture is attributed to a person, which is the part a buyer cares about.
    // Rows measured in the screenshot: #485 Lior Tellem (text occupies y 1848-1877,
    // centred on 1862), #484 arenmoen (2147-2176, centred 2161), #483 Lior Tellem
    // (2492-2519, centred 2505).
    covers: [nameAt(1862), nameAt(2161), nameAt(2505)],
    note: 'hero',
  },
  {
    name: 'tag-part-2',
    src: 'IMG_3524.PNG',
    // The capture, whole: "Bag 402 of 458" in the title bar, the search field with the
    // Scan button beside it, the hinge photographed in place with its FASTENERS tag and
    // the QR sticker already on it, PHOTO NOTE, then the LABEL block that carries the
    // three things the copy promises are on the record without typing — "Top hinge",
    // "QR: setyl.it/3DWQGD" and "Area: House/PH" — and the Newer/Older pager reading
    // 57 / 458. The old cut stopped at 1760, i.e. at the bottom of the photo, so the
    // label block the sentence is actually about was never on screen.
    top: STATUS_BAR,
    bottom: HOME_BAR,
    note: 'step 01',
  },
  {
    name: 'scan-part-2',
    src: 'IMG_3526.PNG',
    // Full-bleed camera: NO status bar, content starts at row 0 — hence the literal 0
    // rather than STATUS_BAR. Runs from the close button and the "Scan to find hardware"
    // pill, through the reticle sitting on an IF FOUND PLEASE SCAN sticker, down past the
    // second pill: "Point at any captured QR sticker". The old cut ended at 1465 and lost
    // that lower pill entirely.
    //
    // This is the one crop that stops short of the bottom on grounds other than a name:
    // below ~2010 the frame is bare deck and floor, and 550 rows of empty grey would make
    // the tile taller without adding a pixel of app.
    top: 0,
    bottom: 2010,
    note: 'step 02',
  },
  {
    name: 'part-record-2',
    src: 'IMG_3525.PNG',
    // The part record, whole: title bar, search + Scan, the DISPOSITION card with all
    // five states and the live one filled (Remove & reinstall) plus Mark urgent, PARTS
    // ("This part goes back on as-is, so there is nothing to order"), the FASTENERS spec
    // line the copy quotes verbatim — 8x · Bolt · 12-24 · 3/8in · Flat · Phillips ·
    // 316 Stainless · Replace — the voice note the copy also cites, and the Stage row.
    // The old cut opened below the header and closed above Stage, so two of the three
    // things step 03 names were outside it.
    top: STATUS_BAR,
    bottom: HOME_BAR,
    note: 'step 03',
  },
  {
    name: 'order-list-2',
    src: 'IMG_3530.PNG',
    // The procurement list, whole: "Replacement & refurbish", the To Replace (64) /
    // To Refurbish (62) toggle, search, the All / To order / Ordered / Received filter
    // rail, and four rows carrying Received, Ordered and To order with their Add
    // tracking / Mark ordered / Mark received actions. The bottom lands inside the
    // fourth row's buttons, so the list reads as continuing.
    top: STATUS_BAR,
    bottom: HOME_BAR,
    note: 'step 04',
  },
  {
    name: 'export-job-2',
    src: 'IMG_3529.PNG',
    // The export sheet, whole: the "183 items flagged for replacement" scope toggle at
    // the top and all five formats under it — Excel (.xlsx), CSV (.csv), JSON (.json),
    // PDF (.pdf), Web report (.html) — plus Cancel.
    //
    // Stops at 2330 for a reason that is not composition: the sheet's own bottom edge is
    // at ~2305, and the dimmed job list showing through underneath it carries a
    // "Captured by <name>" row at y≈2490. Cutting at the sheet keeps that name off the
    // page without a chip, and there is nothing below the sheet worth showing anyway.
    top: STATUS_BAR,
    bottom: 2330,
    note: 'step 05',
  },
];

if (!DRY) fs.mkdirSync(OUT, { recursive: true });

// The two widths the tiles actually render at (see `.shot` in app/globals.css): the
// container's full width on a 390px phone, and the desktop cap. Printed per shot so the
// on-page height of a recut is visible here rather than only after a build.
const TILE_PHONE = 340;
const TILE_DESKTOP = 380;

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
  const height = Math.min(shot.bottom, meta.height) - top;
  if (height <= 0) {
    console.error(`FAIL  ${shot.name}: empty crop`);
    process.exitCode = 1;
    continue;
  }

  const dest = path.join(OUT, `${shot.name}.webp`);
  const scale = OUT_WIDTH / meta.width;
  const outH = Math.round(height * scale);
  if (DRY) {
    console.log(
      `would write ${shot.name}.webp  from ${shot.src} rows ${top}-${top + height}  -> ${OUT_WIDTH}x${outH}`,
    );
    continue;
  }

  // composite() runs after resize() in sharp's pipeline, so covers are mapped from source
  // space into output space here.
  let pipeline = sharp(file).extract({ left: 0, top, width: meta.width, height }).resize(OUT_WIDTH);
  if (shot.covers?.length) {
    pipeline = pipeline.composite(
      shot.covers.map((c) =>
        coverChip({
          x: Math.round(c.x * scale),
          y: Math.round((c.y - top) * scale),
          w: Math.round(c.w * scale),
          h: Math.round(c.h * scale),
        }),
      ),
    );
  }
  const out = await pipeline.webp({ quality: WEBP_QUALITY }).toFile(dest);

  const kb = (fs.statSync(dest).size / 1024).toFixed(0);
  const onPhone = Math.round(out.height * (TILE_PHONE / out.width));
  const onDesktop = Math.round(out.height * (TILE_DESKTOP / out.width));
  results.push({ name: shot.name, w: out.width, h: out.height });
  console.log(
    `ok    ${shot.name}.webp  ${out.width}x${out.height}  ${kb} KB  ` +
      `[${shot.src} ${top}-${top + height}]  renders ${TILE_PHONE}x${onPhone} / ${TILE_DESKTOP}x${onDesktop}`,
  );
}

// page.tsx needs the real intrinsic sizes: handing an 1206x2010 file the wrong height
// makes Next write the wrong aspect-ratio and the browser renders it stretched, with no
// build error. Print them so they can be copied across.
if (results.length) {
  console.log('\nintrinsic sizes for app/page.tsx (w/h props):');
  for (const r of results) console.log(`  ${r.name.padEnd(14)} w={${r.w}} h={${r.h}}`);
}
