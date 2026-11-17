// The eight How it works screenshots (Jon, 17 Nov 2026 website package), made web-ready.
//
// Usage (from the repo root):
//   node scripts/make-how-it-works-shots.mjs <package images dir> [out dir] [--only <name>...]
// Defaults: ~/Downloads/refit-site-package/ReFitIQ-Website-Package/images -> public/how
// --only rebuilds just the named shots (e.g. --only 02-project) and keeps the rest of
// public/how and shots.json as they are. A shot with `src` reads that file instead of the
// package (02 is Jon's fresh iPhone capture of 17 Nov, after the action tiles fix).
//
// The originals are only READ. For each one this:
//   1. crops the phone's status bar off the top (clock, signal, battery);
//   2. blurs, beyond reading, anything that names a person or that the page should not show:
//      technician usernames ("by electr8", "by arenmoen", "Captured by ..."), the red
//      "Due 11 Nov, 5 days overdue" line, and every "No one assigned — only admins can see
//      this" line. Boat names stay. Each box is pixelated AND blurred, so no trace of the
//      letter shapes survives;
//   3. writes AVIF and WebP at the page's 1x and 2x display widths (the package's own advice:
//      about 480px for the full-height screens, 330px for the two 706px ones), plus a WebP
//      of the whole cropped screen for "tap to open full size";
//   4. prints the intrinsic width/height of each output, which the page needs.
//
// Boxes are [left, top, right, bottom] in ORIGINAL pixels (before the crop).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const argv = process.argv.slice(2);
const onlyAt = argv.indexOf('--only');
const ONLY = onlyAt >= 0 ? argv.slice(onlyAt + 1) : null;
const pos = onlyAt >= 0 ? argv.slice(0, onlyAt) : argv;
const DOWNLOADS = path.join(os.homedir(), 'Downloads');
const SRC = pos[0] ?? path.join(DOWNLOADS, 'refit-site-package', 'ReFitIQ-Website-Package', 'images');
const OUT = pos[1] ?? path.join(process.cwd(), 'public', 'how');

const SHOTS = [
  {
    file: '01-refitiq-jobs-overview.png', name: '01-jobs', top: 170, css: 480,
    blur: [
      [88, 1078, 670, 1140],      // Due 11 Nov, 5 days overdue
      [88, 1496, 860, 1556],      // No one assigned — only admins can see this
      [88, 1912, 860, 1972],
      [88, 2328, 860, 2388],
    ],
  },
  {
    // Castaway-6469's boat file on an iPhone, 17 Nov 2026, after the action tiles fix (one
    // label per tile, "99+" on the badge). It replaced the package's 02, which showed "9..".
    // The file Jon sent is 721px wide, so its 2x is 721, not 960.
    src: path.join(DOWNLOADS, 'castaway-boat-file.png'), name: '02-project', top: 100, css: 480,
    blur: [
      [56, 302, 390, 336],        // Due 11 Nov, 6 days overdue
      [205, 1254, 466, 1284],     // Captured by Jon Anderson
      [205, 1492, 455, 1516],     // Captured by scott_justin (cut off by the screen's edge)
    ],
  },
  { file: '03-refitiq-photo-gallery.jpeg', name: '03-gallery', top: 100, css: 330, blur: [] },
  { file: '04-refitiq-part-photos.jpeg', name: '04-part-photos', top: 100, css: 330, blur: [] },
  {
    file: '05-refitiq-part-instructions.png', name: '05-part-plan', top: 170, css: 480,
    blur: [
      [262, 836, 470, 888],       // Captured by electr8
      [255, 889, 480, 941],       // Installed by arenmoen
    ],
  },
  { file: '06-refitiq-fastener-details.png', name: '06-fasteners', top: 170, css: 480, blur: [] },
  {
    file: '07-refitiq-part-history.png', name: '07-history', top: 170, css: 480,
    blur: [
      [112, 910, 330, 964],       // by electr8
      [112, 1181, 350, 1235],     // by arenmoen
    ],
  },
  { file: '08-refitiq-replacement-ordering.png', name: '08-replacements', top: 170, css: 480, blur: [] },
];

fs.mkdirSync(OUT, { recursive: true });
const metaPath = path.join(OUT, 'shots.json');
const meta = ONLY && fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : [];
for (const s of SHOTS) {
  if (ONLY && !ONLY.includes(s.name)) continue;
  const src = s.src ?? path.join(SRC, s.file);
  // A new source can change the 2x width (02 went 960 -> 721): clear this shot's old files.
  for (const f of fs.readdirSync(OUT)) if (f.startsWith(`${s.name}-`)) fs.rmSync(path.join(OUT, f));
  const img = sharp(src);
  const { width, height } = await img.metadata();
  const layers = [];
  for (const [l, t, r, b] of s.blur) {
    const w = r - l, h = b - t;
    // Pixelate to ~12px cells, then blur: unreadable, and no sharp edges.
    const region = await sharp(src).extract({ left: l, top: t, width: w, height: h })
      .resize(Math.max(1, Math.round(w / 12)), Math.max(1, Math.round(h / 12)), { kernel: 'cubic' })
      .resize(w, h, { kernel: 'nearest' })
      .blur(12)
      .toBuffer();
    layers.push({ input: region, left: l, top: t });
  }
  const cleaned = await sharp(src).composite(layers).png().toBuffer();
  const cropped = await sharp(cleaned).extract({ left: 0, top: s.top, width, height: height - s.top }).png().toBuffer();
  const ch = height - s.top;
  for (const scale of [1, 2]) {
    const w = Math.min(width, s.css * scale);
    const base = sharp(cropped).resize({ width: w });
    await base.clone().avif({ quality: 60, effort: 6 }).toFile(path.join(OUT, `${s.name}-${w}.avif`));
    await base.clone().webp({ quality: 82 }).toFile(path.join(OUT, `${s.name}-${w}.webp`));
  }
  await sharp(cropped).webp({ quality: 85 }).toFile(path.join(OUT, `${s.name}-full.webp`));
  const entry = { name: s.name, w1: Math.min(width, s.css), w2: Math.min(width, s.css * 2), full: [width, ch], aspect: +(ch / width).toFixed(4) };
  const at = meta.findIndex((m) => m.name === s.name);
  if (at >= 0) meta[at] = entry; else meta.push(entry);
  console.log(`${s.name}: cropped ${width}x${ch}, blurred ${s.blur.length} box(es)`);
}
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 1));
console.log(`wrote ${meta.length} shots to ${OUT}`);
