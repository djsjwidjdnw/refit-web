// scripts/measure-fold.mjs — measure the hero against the real fold, don't compute it.
//
// The hero is budgeted in px in the comments in app/page.tsx, and every previous copy pass
// got the arithmetic wrong at least once: line-wrapping depends on the font actually
// loading and on the exact glyphs, so the only trustworthy number comes from a browser.
// Uses SYSTEM CHROME rather than a bundled build, because the bundled Chromium renders the
// webfont slightly narrower and reports a fold ~8px lower than a real phone does.
//
//   node scripts/measure-fold.mjs                       (against a running dev/prod server)
//   node scripts/measure-fold.mjs http://localhost:3000
//
// Prints, for 390x664 (iPhone in the Facebook in-app browser, the majority case) and for
// 1280x800: the bottom edge of every hero element, whether the CTA and the value prop
// clear the fold, and how much real screenshot is visible.

import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:3000';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const TARGETS = [
  ['.eyebrow', 'eyebrow'],
  ['.hero-copy h1', 'H1'],
  ['.hero-copy p', 'subhead'],
  ['.hero-cta', 'CTA button'],
  ['.hero-note', 'hero note'],
  ['.hero-trust', 'trust line'],
  ['.hero-shot .shot img', 'screenshot'],
];

async function measure(browser, w, h, label) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: w < 500 ? 3 : 1,
    isMobile: w < 500,
    hasTouch: w < 500,
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // Images are lazy below the fold; the hero shot is priority so it is already in flight.
  await page.waitForTimeout(400);

  console.log(`\n── ${label}  (${w}x${h}) ─────────────────────────────`);
  const out = {};
  for (const [sel, name] of TARGETS) {
    const box = await page.locator(sel).first().boundingBox().catch(() => null);
    if (!box) { console.log(`  ${name.padEnd(12)} NOT FOUND (${sel})`); continue; }
    const bottom = Math.round(box.y + box.height);
    out[name] = { top: Math.round(box.y), bottom, h: Math.round(box.height) };
    const flag = bottom <= h ? 'above fold' : `${bottom - h}px BELOW fold`;
    console.log(
      `  ${name.padEnd(12)} top ${String(Math.round(box.y)).padStart(4)}  ` +
      `bottom ${String(bottom).padStart(4)}  h ${String(Math.round(box.height)).padStart(4)}  ${flag}`,
    );
  }

  // The two things that MUST clear the fold: the promise and the way to act on it.
  const sub = out['subhead'];
  const cta = out['CTA button'];
  const shot = out['screenshot'];
  console.log('  ' + '-'.repeat(58));
  console.log(`  value prop clears fold : ${sub && sub.bottom <= h ? 'YES' : 'NO'}`);
  console.log(`  CTA clears fold        : ${cta && cta.bottom <= h ? 'YES' : 'NO'}`);
  if (shot) {
    const visible = Math.max(0, Math.min(h, shot.bottom) - shot.top);
    console.log(`  screenshot top edge    : ${shot.top}px`);
    console.log(`  real app screen shown  : ${visible}px`);
  }

  // Line counts, since the budget in page.tsx is written in lines.
  const lines = await page.evaluate(() => {
    const count = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      return Math.round(el.getBoundingClientRect().height / lh);
    };
    return { h1: count('.hero-copy h1'), sub: count('.hero-copy p') };
  });
  console.log(`  H1 lines / subhead lines: ${lines.h1} / ${lines.sub}`);

  await ctx.close();
  return { out, h };
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
await measure(browser, 390, 664, 'PHONE  (Facebook in-app browser)');
await measure(browser, 1280, 800, 'DESKTOP');
await browser.close();
