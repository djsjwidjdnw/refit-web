// make-brand-assets.mjs — cuts the three ReFitIQ brand source files down to every
// size both repos actually need.
//
// WHY THIS EXISTS
// The three files delivered by the designer are 1206x2622 phone-screenshot canvases
// with the artwork floating in a sea of black — not usable assets. Every consumer
// (Apple's icon slot, Android's adaptive foreground, a favicon, a web header) needs
// the artwork cropped to its own bounds first, then re-padded to that consumer's
// rules. Doing it by eye once and pasting the numbers would rot the moment a new
// source file arrives, so the crop box is DETECTED from pixel data every run.
//
// USAGE (from refit-web root):
//   node scripts/make-brand-assets.mjs [--src <dir>] [--dry-run]
//
// Sources (in --src, default C:/Users/chase/Downloads):
//   appicon.png       square app-icon lockup, already inside its own rounded border
//   logoicon.png      stacked mark  (boat over ReFitIQ)      — for tight spaces
//   logoiconlong.png  horizontal lockup (boat beside REFITIQ) — for wide spaces

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(n);
  return i === -1 ? d : args[i + 1];
};
const SRC = flag('--src', 'C:/Users/chase/Downloads');
const DRY = args.includes('--dry-run');

const WEB = path.resolve(process.cwd());
const APP = path.resolve(WEB, '..', 'hardware-memory');

// Pure black is the source canvas. Anything above this in any channel is artwork.
// 18 is comfortably above PNG compression noise and comfortably below the darkest
// real pixel in the marks (the boat hull's shadow side sits around 40).
const INK_THRESHOLD = 18;

const written = [];

/** Detect the artwork's bounding box inside the black canvas. */
async function bbox(file) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * C;
      if (data[i] > INK_THRESHOLD || data[i + 1] > INK_THRESHOLD || data[i + 2] > INK_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error(`${file}: no artwork found above threshold ${INK_THRESHOLD}`);
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

const cropped = (file, box) => sharp(file).extract(box);

/**
 * Artwork centred on a square opaque canvas at `scale` of the canvas.
 *
 * `scale` is the lever for platform masks. iOS applies its own superellipse to the
 * full 1024 square; appicon.png already carries a rounded orange border of its own,
 * and at 100% Apple's mask cuts a larger radius than the artwork's, shaving the
 * corners off the border. Insetting keeps the designed border fully inside the mask.
 */
async function squareOn(file, box, size, scale, bg, out) {
  const inner = Math.round(size * scale);
  const art = await cropped(file, box)
    .resize(inner, inner, { fit: 'contain', background: bg })
    .toBuffer();
  const img = sharp({
    create: { width: size, height: size, channels: 3, background: bg },
  })
    .composite([{ input: art, gravity: 'center' }])
    .removeAlpha()
    .flatten({ background: bg })
    .png({ compressionLevel: 9 });
  await write(img, out, size, size);
}

/**
 * Turn the art's black backing into transparency.
 *
 * The marks are drawn ON black, so pasting one onto any surface that is not pure
 * black — the site's #0e0e10, the OG card's warm glow — shows as a hard black
 * rectangle around the logo. Keying on luminance (alpha = max(r,g,b)) removes it
 * and, because it is a continuous ramp rather than a threshold, keeps the orange
 * bloom under the boat and the soft glow on the rule feathering out correctly
 * instead of leaving a cut-out edge.
 */
async function keyBlack(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const a = Math.max(data[i], data[i + 1], data[i + 2]);
    data[i + channels - 1] = a;
  }
  return sharp(data, { raw: { width, height, channels } }).png({ compressionLevel: 9 }).toBuffer();
}

/**
 * Artwork at a fixed width, height derived from its aspect.
 * `transparent` keys the black backing out — see keyBlack().
 */
async function wide(file, box, width, bg, out, transparent = false) {
  const h = Math.round((box.height / box.width) * width);
  let buf = await cropped(file, box).resize(width, h, { fit: 'fill' }).png().toBuffer();
  if (transparent) buf = await keyBlack(buf);
  const img = transparent
    ? sharp(buf)
    : sharp(buf).removeAlpha().flatten({ background: bg }).png({ compressionLevel: 9 });
  await write(img, out, width, h);
}

async function write(pipeline, out, expectW, expectH) {
  if (DRY) {
    written.push({ out, w: expectW, h: expectH, bytes: 0, alpha: null, dry: true });
    return;
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await pipeline.toFile(out);
  const m = await sharp(out).metadata();
  const { size } = fs.statSync(out);
  written.push({ out, w: m.width, h: m.height, bytes: size, alpha: m.hasAlpha, ch: m.channels });
  if (expectW && (m.width !== expectW || m.height !== expectH)) {
    throw new Error(`${out}: expected ${expectW}x${expectH}, got ${m.width}x${m.height}`);
  }
}

const SRC_ICON = path.join(SRC, 'appicon.png');
const SRC_MARK = path.join(SRC, 'logoicon.png');
const SRC_LONG = path.join(SRC, 'logoiconlong.png');

const bIcon = await bbox(SRC_ICON);
const bMark = await bbox(SRC_MARK);
const bLong = await bbox(SRC_LONG);
console.log('detected crops:');
console.log('  appicon      ', JSON.stringify(bIcon));
console.log('  logoicon     ', JSON.stringify(bMark));
console.log('  logoiconlong ', JSON.stringify(bLong));
console.log('');

const BLACK = { r: 0, g: 0, b: 0 };

// ── iOS / Expo app icon ──────────────────────────────────────────────────────
// 1024x1024, RGB, NO alpha — App Store Connect rejects an icon with an alpha
// channel outright. 0.92 keeps the artwork's own orange border clear of Apple's
// mask; see squareOn().
await squareOn(SRC_ICON, bIcon, 1024, 0.92, BLACK, path.join(APP, 'assets', 'icon.png'));

// ── Android adaptive foreground ──────────────────────────────────────────────
// Android crops the foreground to a centre circle/squircle and only guarantees the
// inner 66%. The stacked mark (no border of its own) at 0.60 sits safely inside
// that on every OEM mask shape.
await squareOn(SRC_MARK, bMark, 1024, 0.6, BLACK, path.join(APP, 'assets', 'adaptive-icon.png'));

// ── Expo splash ──────────────────────────────────────────────────────────────
// resizeMode 'contain' on a dark background; the stacked mark reads at any size.
await squareOn(SRC_MARK, bMark, 1024, 0.72, BLACK, path.join(APP, 'assets', 'splash-icon.png'));

// ── In-app marks (bundled into the JS update, so these ship OTA) ─────────────
await wide(SRC_LONG, bLong, 640, BLACK, path.join(APP, 'assets', 'brand-logo-long.png'), true);
await wide(SRC_MARK, bMark, 512, BLACK, path.join(APP, 'assets', 'brand-logo-mark.png'), true);

// ── Compact horizontal lockup ────────────────────────────────────────────────
// The full lockup carries "TRACK. TAG. REINSTALL." and a glow rule under the
// wordmark. In a 30px-tall nav slot that tagline renders about two pixels high —
// visual mush that also forces the whole mark wider for a given legible wordmark.
// This variant keeps only the boat + REFITIQ band (measured, not eyeballed: the
// wordmark ink ends at row 178 of 225; the tagline is 180-194 and the rule 207-223).
const bCompact = { ...bLong, top: bLong.top + 15, height: 164 };
await wide(SRC_LONG, bCompact, 560, BLACK, path.join(WEB, 'public', 'brand', 'logo-compact.png'), true);
await wide(SRC_LONG, bCompact, 640, BLACK, path.join(APP, 'assets', 'brand-logo-compact.png'), true);

// Expo's `web.favicon` slot.
await squareOn(SRC_ICON, bIcon, 48, 1, BLACK, path.join(APP, 'assets', 'favicon.png'));

// ── Web favicons ─────────────────────────────────────────────────────────────
// Next's App Router file conventions: app/icon.png and app/apple-icon.png are
// picked up automatically and emit the <link> tags, so no manual head markup.
// apple-touch-icon is composited on opaque black because iOS home-screen icons
// get no background of their own.
await squareOn(SRC_ICON, bIcon, 512, 1, BLACK, path.join(WEB, 'app', 'icon.png'));
await squareOn(SRC_ICON, bIcon, 180, 1, BLACK, path.join(WEB, 'app', 'apple-icon.png'));

// ── Web header / footer marks ────────────────────────────────────────────────
// 2x of the largest rendered size, so they stay sharp on retina without shipping
// the full-resolution source.
await wide(SRC_LONG, bLong, 560, BLACK, path.join(WEB, 'public', 'brand', 'logo-long.png'), true);
await wide(SRC_MARK, bMark, 360, BLACK, path.join(WEB, 'public', 'brand', 'logo-mark.png'), true);

console.log('written:');
for (const w of written) {
  const rel = path.relative(path.resolve(WEB, '..'), w.out).replace(/\\/g, '/');
  console.log(
    `  ${rel.padEnd(46)} ${String(w.w).padStart(4)}x${String(w.h).padEnd(4)}` +
      (w.dry ? '  (dry run)' : `  ${(w.bytes / 1024).toFixed(1).padStart(6)} KB  alpha=${w.alpha} ch=${w.ch}`)
  );
}

// Hard gate: an alpha channel on the iOS icon is an App Store rejection, so fail
// the build rather than let it reach a submission.
if (!DRY) {
  const iosIcon = path.join(APP, 'assets', 'icon.png');
  const m = await sharp(iosIcon).metadata();
  if (m.hasAlpha || m.channels !== 3 || m.width !== 1024 || m.height !== 1024) {
    console.error(
      `FATAL: ${iosIcon} must be 1024x1024 RGB with no alpha — got ${m.width}x${m.height}, channels=${m.channels}, hasAlpha=${m.hasAlpha}`
    );
    process.exit(1);
  }
  console.log('\nOK: app icon is 1024x1024, 3-channel RGB, no alpha channel.');
}
