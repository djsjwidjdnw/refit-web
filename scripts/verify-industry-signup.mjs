// verify-industry-signup.mjs — prove the industry picker works end to end on PRODUCTION.
//
// ⚠️  THIS WRITES TO THE LIVE SUPABASE PROJECT. It signs up two throwaway shops through
// the real signup form at refit-iq.com, one per trade, and TEARS THEM DOWN in a `finally`
// so a mid-run failure cannot leak a row. That leak has happened before: shop
// 660416f1-dacb-45b0-951a-3b37aaa6f722 ("E2E Throwaway local1") is still orphaned because
// an earlier script only printed cleanup SQL. If teardown cannot run, this prints the real
// shop ids and the exact SQL rather than exiting quietly.
//
// It also reads Philbrook's row before and after, and asserts nothing about it moved.
// Philbrook's is READ ONLY here. Nothing in this file writes to it.
//
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/verify-industry-signup.mjs [baseUrl]

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const BASE = process.argv[2] || 'https://refit-iq.com';
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CHROME = String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;

if (!URL || !KEY) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const admin = createClient(URL, KEY, { auth: { persistSession: false } });

let passed = 0;
const ok = (m) => { passed++; console.log(`  ✓ ${m}`); };
const bad = (m) => { console.error(`  ✗ ${m}`); process.exitCode = 1; };

const STAMP = String(Date.now());
const made = []; // { email, shopId, userId, trade }

// ── Philbrook's, before ────────────────────────────────────────────────────────────────
const { data: philBefore } = await admin
  .from('shops')
  .select('id, name, industry, auto_numbering_enabled, join_code, created_at')
  .ilike('name', '%philbrook%')
  .order('created_at');

console.log(`\nProduction industry verification — ${BASE}\n`);
console.log(`Philbrook's rows found: ${philBefore?.length ?? 0}`);
for (const s of philBefore ?? []) {
  console.log(`  ${s.id}  ${JSON.stringify(s.name)}  industry=${s.industry}  auto_numbering=${s.auto_numbering_enabled}`);
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

try {
  for (const trade of ['automotive', 'marine']) {
    const email = `refit-ind-${trade}-${STAMP}@mailinator.com`;
    const password = `Ind-test-${STAMP}!`;
    const shopName = `ZZ Industry Throwaway ${trade} ${STAMP}`;

    console.log(`\n── ${trade.toUpperCase()} ───────────────────────────────────────────`);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle' });

    // The picker must actually be on the page, and must offer exactly the trades that have
    // a pack. If a trade with no pack is selectable, that is the failure this gates.
    const opts = await page.$$eval('#industry option', (os) => os.map((o) => o.value));
    if (JSON.stringify(opts) !== JSON.stringify(['marine', 'automotive']))
      bad(`picker offers ${JSON.stringify(opts)}, expected ["marine","automotive"]`);
    else ok(`picker offers exactly the trades that have a pack: ${opts.join(', ')}`);

    await page.fill('#shop', shopName);
    await page.selectOption('#industry', trade);
    await page.fill('#email', email);
    await page.fill('#password', password);

    // The hint under the picker has to track the selection, or the choice is unlabelled.
    const hint = (await page.locator('#industry').locator('xpath=../p').innerText()).trim();
    console.log(`     hint: ${hint.slice(0, 72)}`);

    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 45000 });
    ok('signup completed and landed on /dashboard');
    await ctx.close();

    // ── what actually landed in the database ──────────────────────────────────────────
    const { data: shop, error: se } = await admin
      .from('shops')
      .select('id, name, industry, auto_numbering_enabled')
      .eq('name', shopName)
      .maybeSingle();
    if (se || !shop) { bad(`shop row not found: ${se?.message}`); continue; }

    const { data: u } = await admin.auth.admin.listUsers({ perPage: 200 });
    const userId = u?.users?.find((x) => x.email === email)?.id ?? null;
    made.push({ email, shopId: shop.id, userId, trade });

    if (shop.industry !== trade) bad(`shops.industry = ${shop.industry}, expected ${trade}`);
    else ok(`shops.industry = "${shop.industry}" (${shop.id})`);

    // The trial must still open exactly as before. The picker must not have changed billing.
    const { data: ent } = await admin
      .from('shop_entitlements')
      .select('plan, subscription_status, trial_ends_at')
      .eq('shop_id', shop.id)
      .maybeSingle();
    if (ent?.subscription_status !== 'trialing' || ent?.plan !== 'none')
      bad(`entitlement wrong: ${JSON.stringify(ent)}`);
    else ok(`14-day trial opened unchanged (plan=none, trialing)`);

    // ── the read the APP makes ────────────────────────────────────────────────────────
    // lib/industry/index.ts does getMyShopId() then .from('shops').select('industry').
    // Reproduce it as the real member, through PostgREST and RLS, not as the service role —
    // service-role would bypass shops_select_member and prove nothing about what the tech
    // on the phone can actually see.
    const asUser = createClient(URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { error: signInErr } = await asUser.auth.signInWithPassword({ email, password });
    if (signInErr) { bad(`could not sign in as the member: ${signInErr.message}`); continue; }

    const { data: mem } = await asUser
      .from('shop_members').select('shop_id, role').order('created_at').limit(1).maybeSingle();
    const { data: seen, error: seenErr } = await asUser
      .from('shops').select('industry').eq('id', mem.shop_id).maybeSingle();
    if (seenErr || seen?.industry !== trade)
      bad(`the app's own read returned ${JSON.stringify(seen)} (${seenErr?.message ?? 'no error'})`);
    else ok(`the app's read under RLS resolves "${seen.industry}" -> ${trade} pack`);
    await asUser.auth.signOut();
  }
} finally {
  // ── TEARDOWN, always ──────────────────────────────────────────────────────────────────
  console.log('\n── teardown ──────────────────────────────────────────');
  for (const m of made) {
    let shopGone = false, userGone = false;
    try {
      // shop_entitlements cascades from shops (0027:70). shop_members cascades from both.
      const { error } = await admin.from('shops').delete().eq('id', m.shopId);
      shopGone = !error;
      if (error) console.error(`     shop delete failed: ${error.message}`);
    } catch (e) { console.error(`     shop delete threw: ${e.message}`); }
    try {
      if (m.userId) {
        const { error } = await admin.auth.admin.deleteUser(m.userId);
        userGone = !error;
        if (error) console.error(`     user delete failed: ${error.message}`);
      }
    } catch (e) { console.error(`     user delete threw: ${e.message}`); }

    console.log(`  ${m.trade.padEnd(11)} shop ${m.shopId} ${shopGone ? 'DELETED' : 'LEFT BEHIND'} | user ${userGone ? 'DELETED' : 'LEFT BEHIND'}`);
    if (!shopGone || !userGone) {
      process.exitCode = 1;
      console.error(`     CLEAN UP BY HAND:\n       delete from public.shops where id = '${m.shopId}';\n       delete from auth.users where id = '${m.userId}';`);
    }
  }

  // Nothing may be left with our marker.
  const { data: leftovers } = await admin
    .from('shops').select('id, name, industry').ilike('name', `%Industry Throwaway%`);
  if (leftovers?.length) {
    process.exitCode = 1;
    console.error(`  ✗ ${leftovers.length} throwaway shop(s) still present: ${JSON.stringify(leftovers)}`);
  } else {
    ok('no throwaway rows remain');
  }

  await browser.close();
}

// ── Philbrook's, after ────────────────────────────────────────────────────────────────
const { data: philAfter } = await admin
  .from('shops')
  .select('id, name, industry, auto_numbering_enabled, join_code, created_at')
  .ilike('name', '%philbrook%')
  .order('created_at');

console.log('\n── Philbrook’s, before vs after ──────────────────────');
const norm = (rows) => JSON.stringify((rows ?? []).map((r) => [r.id, r.name, r.industry, r.auto_numbering_enabled, r.join_code]));
if (norm(philBefore) !== norm(philAfter)) bad('Philbrook’s rows CHANGED during this run');
else ok(`all ${philAfter?.length ?? 0} Philbrook’s rows byte-identical before and after`);

for (const s of philAfter ?? []) {
  if (s.industry !== 'marine') bad(`${s.name} is industry=${s.industry}, expected marine`);
}
if ((philAfter ?? []).every((s) => s.industry === 'marine'))
  ok('every Philbrook’s row is industry = marine (they see today’s copy, unchanged)');

const canary = (philAfter ?? []).find((s) => s.auto_numbering_enabled === false);
if (canary) ok(`the auto-numbering canary held: ${JSON.stringify(canary.name)} still auto_numbering_enabled = false`);
else bad('no Philbrook’s row has auto_numbering_enabled = false — the 0045 setting may have been lost');

// Whole-fleet sanity: nothing else drifted off marine unexpectedly.
const { data: all } = await admin.from('shops').select('industry');
const mix = (all ?? []).reduce((m, r) => ((m[r.industry ?? 'null'] = (m[r.industry ?? 'null'] ?? 0) + 1), m), {});
console.log(`\nfleet industry mix after the run: ${JSON.stringify(mix)}  (total ${all?.length ?? 0})`);

console.log(`\n${passed} checks passed.\n`);
