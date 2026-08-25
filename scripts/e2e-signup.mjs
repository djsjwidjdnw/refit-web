// e2e-signup.mjs — end-to-end signup from a landing-page CTA click, on a phone viewport.
// Counts the real steps and fields, then TEARS DOWN the throwaway account it created.
//
// ⚠️  THIS WRITES TO WHATEVER SUPABASE PROJECT THE TARGET APP POINTS AT.
// There is no separate dev project: .env.local points `next dev` at production, so a run
// against http://localhost:3987 creates a REAL shop in the live database. That is exactly
// how shop 660416f1-dacb-45b0-951a-3b37aaa6f722 ("E2E Throwaway local1") was orphaned —
// the original version of this script had no teardown and only wrote the credentials to a
// json file for manual deletion, which was done half-way (auth user removed, shops +
// shop_entitlements rows left behind).
//
// That row has since been cleaned up: verified absent from public.shops on 2026-08-25, and
// no entitlement row is left pointing at it. The paragraph above stays as the reason the
// teardown below is in a `finally` — do not read it as an outstanding cleanup task.
//
// Teardown now runs in a `finally`, so it fires even when the run fails mid-flow. It
// deletes the shops row (shop_entitlements cascades via 0027_entitlements.sql:70) and then
// the auth user. If it cannot run — no service-role key — it prints the exact SQL and the
// real shop id instead of silently leaking a row.
//
// USAGE
//   export SUPABASE_SERVICE_ROLE_KEY=...          # required for teardown
//   node scripts/e2e-signup.mjs [baseUrl] [stamp] [--keep]
//
//   --keep   leave the account alive (to inspect the dashboard by hand). Prints the
//            cleanup SQL so you can delete it yourself.
//
// Requires playwright, which is deliberately NOT a dependency of this app — install it
// ad hoc with `npm i -D playwright && npx playwright install chromium`, or point
// PLAYWRIGHT_CHROMIUM at an existing binary.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const KEEP = argv.includes('--keep');
const positional = argv.filter((a) => !a.startsWith('--'));

const BASE = positional[0] || 'http://localhost:3987';
const STAMP = positional[1] || String(Date.now());
const EMAIL = `refit-e2e-${STAMP}@mailinator.com`;
const PASSWORD = `E2e-test-${STAMP}!`;
const SHOP = `E2E Throwaway ${STAMP}`;

// ── Supabase admin handle, used only for teardown ─────────────────────────────────────
// URL comes from .env.local (same file `next dev` reads, so teardown can never target a
// different project than the run wrote to). The service key is env-only and never read
// from a file in this repo.
function readEnvLocal() {
  const p = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(p)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(p, 'utf8')
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
      }),
  );
}
const envLocal = readEnvLocal();
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || envLocal.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const admin = (url, init = {}) =>
  fetch(`${SUPA_URL}${url}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

// Resolve the rows this run created. Done by name/email rather than by scraping the UI so
// it still works when the run failed before reaching /dashboard.
async function findCreated() {
  const out = { shopId: null, userId: null };
  try {
    const r = await admin(`/rest/v1/shops?select=id,name&name=eq.${encodeURIComponent(SHOP)}`);
    if (r.ok) {
      const rows = await r.json();
      if (rows[0]) out.shopId = rows[0].id;
    }
  } catch {
    /* teardown must never mask the test result */
  }
  try {
    const r = await admin(`/auth/v1/admin/users?filter=${encodeURIComponent(EMAIL)}&per_page=50`);
    if (r.ok) {
      const body = await r.json();
      const hit = (body.users || []).find((u) => u.email === EMAIL);
      if (hit) out.userId = hit.id;
    }
  } catch {
    /* ditto */
  }
  return out;
}

async function teardown() {
  console.log(`\n--- TEARDOWN ---`);

  if (KEEP) {
    const { shopId } = SERVICE_KEY && SUPA_URL ? await findCreated() : { shopId: null };
    console.log(`--keep set — account left alive on purpose.`);
    console.log(`  email : ${EMAIL}`);
    console.log(`  shop  : ${SHOP}${shopId ? ` (${shopId})` : ''}`);
    if (shopId) console.log(`  clean up later:  delete from public.shops where id = '${shopId}';`);
    return;
  }

  if (!SUPA_URL || !SERVICE_KEY) {
    console.error(`!! CANNOT TEAR DOWN — ${!SUPA_URL ? 'NEXT_PUBLIC_SUPABASE_URL' : 'SUPABASE_SERVICE_ROLE_KEY'} is not set.`);
    console.error(`!! This run left a LIVE shop behind. Delete it by name:`);
    console.error(`     delete from public.shops where name = '${SHOP}';`);
    console.error(`   and remove the auth user ${EMAIL} from the Supabase dashboard.`);
    process.exitCode = 1;
    return;
  }

  const { shopId, userId } = await findCreated();

  // Shop first: shop_entitlements has `on delete cascade` on shop_id, and shop_members
  // cascades too, so one delete clears the whole tree. Doing it before the auth user
  // avoids tripping any FK that points the other way.
  if (shopId) {
    const r = await admin(`/rest/v1/shops?id=eq.${shopId}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    });
    console.log(`shop  ${shopId}  -> ${r.ok ? 'deleted' : `FAILED ${r.status} ${await r.text()}`}`);
    if (!r.ok) {
      console.error(`   manual cleanup:  delete from public.shops where id = '${shopId}';`);
      process.exitCode = 1;
    }
  } else {
    console.log(`shop  (none found for "${SHOP}" — nothing to delete)`);
  }

  if (userId) {
    const r = await admin(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' });
    console.log(`user  ${userId}  -> ${r.ok ? 'deleted' : `FAILED ${r.status} ${await r.text()}`}`);
    if (!r.ok) process.exitCode = 1;
  } else {
    console.log(`user  (none found for ${EMAIL} — nothing to delete)`);
  }

  // Prove it: a leftover here is the exact failure this teardown exists to prevent.
  const check = await admin(
    `/rest/v1/shops?select=id&name=eq.${encodeURIComponent(SHOP)}`,
  );
  if (check.ok) {
    const left = await check.json();
    console.log(left.length === 0 ? `verified: no rows left behind ✓` : `!! ${left.length} row(s) STILL PRESENT: ${left.map((r) => r.id).join(', ')}`);
    if (left.length) process.exitCode = 1;
  }
}

// ── The run ───────────────────────────────────────────────────────────────────────────
// Headed, no --enable-automation, webdriver masked: fbevents.js (app/meta-pixel.tsx)
// detects automation (navigator.webdriver, HeadlessChrome UA, selenium globals) and then
// silently drops every send — events still count in fbq.getState() but nothing reaches
// facebook.com/tr — so the pixel assertions below only mean something with the mask on.
const b = await chromium.launch({
  headless: false,
  ignoreDefaultArgs: ['--enable-automation'],
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM ||
    'C:/Users/chase/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
});
const page = await b.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(() => {
  Object.defineProperty(Object.getPrototypeOf(navigator), 'webdriver', { get: () => false });
});

const steps = [];
const mark = (s) => {
  steps.push(s);
  console.log(`  step ${steps.length}: ${s}`);
};

const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160));
});
const failedReqs = [];
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().includes('favicon')) failedReqs.push(`${r.status()} ${r.url().slice(0, 110)}`);
});
// Meta Pixel hits (app/meta-pixel.tsx). fbevents.js sends GET image requests or POST
// beacons to facebook.com/tr depending on payload size, so check both places for `ev`.
// Only meaningful against the live host — the pixel is hostname-gated off elsewhere.
const PIXEL_HOST = /(^|\.)refit-iq\.com$/.test(new URL(BASE).hostname);
const fbEvents = [];
page.on('request', (req) => {
  if (!/facebook\.com\/tr/.test(req.url())) return;
  const fromUrl = new URL(req.url()).searchParams.get('ev');
  const fromBody = req.postData() ? new URLSearchParams(req.postData()).get('ev') : null;
  fbEvents.push(fromUrl || fromBody || '(unknown)');
});
// Observe, never deliver: a test signup must not mint a real conversion in the
// production pixel dataset — Meta has no way to retract an event, and at this site's
// signup volume each fake CompleteRegistration is a visible distortion of the signal
// campaigns optimize on. Playwright still emits page.on('request') for aborted routes,
// so the exactly-once assertion below keeps working. (The aborts show up as noise in
// the console-errors line; they never reach `failedReqs`, which needs a response.)
await page.route(/facebook\.com\/tr/, (route) => route.abort());

console.log(`\nE2E against ${BASE}`);
console.log(`throwaway email: ${EMAIL}`);
console.log(`teardown: ${KEEP ? 'DISABLED (--keep)' : SERVICE_KEY ? 'enabled' : 'UNAVAILABLE (no SUPABASE_SERVICE_ROLE_KEY)'}\n`);

try {
  const t0 = Date.now();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  mark('land on / (ad click)');

  const cta = page.locator('[data-cta="hero"]');
  await cta.waitFor({ state: 'visible', timeout: 15000 });
  const ctaBox = await cta.boundingBox();
  console.log(`     hero CTA at y=${Math.round(ctaBox.y)} (viewport 844) -> above the fold: ${ctaBox.y + ctaBox.height <= 844}`);
  await cta.click();
  await page.waitForURL('**/signup**', { timeout: 20000 });
  mark(`click CTA -> ${new URL(page.url()).pathname}${new URL(page.url()).search}`);

  // Count the fields the user must actually fill. `input, select` rather than `input`:
  // the trade picker is a <select> and would otherwise be invisible to this census, which
  // is the one place the signup form's real shape gets written down on every run. It is
  // left on its default (Marine) deliberately, so this test never creates a shop in a
  // trade nobody is watching.
  const fields = await page.evaluate(() =>
    [...document.querySelectorAll('form input, form select')].map((i) => ({
      id: i.id,
      type: i.type ?? i.tagName.toLowerCase(),
      required: i.required,
      autocomplete: i.autocomplete,
    })),
  );
  console.log(`     form fields: ${fields.length} -> ${fields.map((f) => `${f.id}(${f.type}${f.required ? ',required' : ''})`).join(', ')}`);

  await page.fill('#shop', SHOP);
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  mark(`fill ${fields.length} fields`);

  await page.click('button[type="submit"]');
  mark('submit');

  let landed = 'TIMEOUT';
  try {
    await page.waitForURL('**/dashboard**', { timeout: 45000 });
    landed = '/dashboard';
  } catch {
    const err = await page.locator('.error').first().textContent().catch(() => null);
    console.log(`     !! did not reach /dashboard. error on page: ${err}`);
  }
  const elapsed = Date.now() - t0;

  let result = {};
  if (landed === '/dashboard') {
    await page.waitForTimeout(2500);
    result = await page.evaluate(() => {
      const txt = document.body.innerText;
      const pill = [...document.querySelectorAll('.pill')].map((p) => p.textContent.trim());
      return {
        heading: document.querySelector('h1')?.textContent?.trim(),
        trialBanner: document.querySelector('.trial-banner')?.textContent?.trim() ?? null,
        pills: pill,
        hasNextSteps: !!document.querySelector('.next-steps'),
        hasGettingStartedLink: !!document.querySelector('a[href="/getting-started"]'),
        hasAppStoreLink: /apps\.apple\.com/.test(document.body.innerHTML),
        mentionsSeats: /Seats used/.test(txt),
      };
    });
    mark('dashboard rendered');
  }

  console.log(`\n--- RESULT ---`);
  console.log(`landed              : ${landed}`);
  console.log(`total steps         : ${steps.length}`);
  console.log(`wall clock          : ${(elapsed / 1000).toFixed(1)}s`);
  console.log(`dashboard heading   : ${result.heading ?? '-'}`);
  console.log(`trial banner        : ${result.trialBanner ?? '-'}`);
  console.log(`status pills        : ${(result.pills || []).join(' | ') || '-'}`);
  console.log(`next-steps card     : ${result.hasNextSteps}`);
  console.log(`getting-started link: ${result.hasGettingStartedLink}`);
  console.log(`app store link      : ${result.hasAppStoreLink}`);
  console.log(`console errors      : ${consoleErrors.length ? consoleErrors.slice(0, 5).join(' ;; ') : 'none'}`);
  console.log(`failed requests     : ${failedReqs.length ? failedReqs.slice(0, 5).join(' ;; ') : 'none'}`);
  const regs = fbEvents.filter((e) => e === 'CompleteRegistration').length;
  if (PIXEL_HOST) {
    console.log(`meta pixel events   : ${fbEvents.join(', ') || 'NONE'} (delivery aborted, attempts only)`);
    console.log(`CompleteRegistration: ${regs} ${regs === 1 ? '✓ (exactly once)' : '!! expected exactly 1'}`);
    if (regs !== 1) process.exitCode = 1;
  } else {
    console.log(`meta pixel events   : gated off on ${new URL(BASE).hostname} (expected none; saw ${fbEvents.length ? fbEvents.join(', ') : 'none'})`);
    if (fbEvents.length) process.exitCode = 1;
  }

  await page.screenshot({ path: `e2e-dashboard-${STAMP}.png`, fullPage: true });
} finally {
  await b.close().catch(() => {});
  // Runs even if the flow above threw — a half-finished signup still creates the shop.
  await teardown();
}
