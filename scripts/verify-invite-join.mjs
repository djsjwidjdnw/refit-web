// verify-invite-join.mjs — prove the invite link end to end on PRODUCTION (Jon, 2026-10-22 #6).
//
// ⚠️  THIS WRITES TO THE LIVE SUPABASE PROJECT, through the real pages at refit-iq.com. It makes a
// throwaway shop with a throwaway admin, then walks four people through that shop's invite link:
//   A. a brand-new person, signed out: "Join <shop>", no trial / plan / billing, the account is
//      made and the request filed in one tap; the admin is notified, accepts with a role and a
//      department, and the link then says "You are in";
//   B. someone with an account and no shop: "Sign in to join <shop>" brings them back to the
//      invite signed in, the request is filed; the admin denies it;
//   C. the 21 Oct trap: someone who made an EMPTY trial shop by mistake is offered to drop it,
//      does, and is accepted;
//   D. someone in a REAL shop (it has a boat) is told so, and nothing changes;
// plus a bad code, the old /signup?join= link, the duplicate-email path and the link preview.
// Everything it made is torn down in a `finally`, and the leftovers are counted. Philbrook's is
// read before and after and never written.
//
//   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
//     node scripts/verify-invite-join.mjs [baseUrl]

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const BASE = process.argv[2] || 'https://refit-iq.com';
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CHROME = String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
if (!URL || !KEY || !ANON) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const admin = createClient(URL, KEY, { auth: { persistSession: false } });

let passed = 0;
const ok = (m) => { passed++; console.log(`  ✓ ${m}`); };
const bad = (m) => { console.error(`  ✗ ${m}`); process.exitCode = 1; };
const check = (cond, m, detail) => (cond ? ok(m) : bad(`${m}${detail ? ` — ${detail}` : ''}`));

const STAMP = String(Date.now());
const PASSWORD = `Join-test-${STAMP}!`;
const users = []; // every auth user made, for teardown
const shops = []; // every shop made, for teardown
const emailFor = (who) => `refit-join-${who}-${STAMP}@mailinator.com`;

async function makeUser(who) {
  const { data, error } = await admin.auth.admin.createUser({
    email: emailFor(who),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: `ZZ ${who}` },
  });
  if (error) throw new Error(`createUser ${who}: ${error.message}`);
  users.push(data.user.id);
  return data.user.id;
}
async function signedIn(who) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email: emailFor(who), password: PASSWORD });
  if (error) throw new Error(`sign in ${who}: ${error.message}`);
  return c;
}
async function provision(client, name) {
  const { data, error } = await client.rpc('provision_new_shop_v2', { _shop_name: name, _industry: 'marine' });
  if (error) throw new Error(`provision ${name}: ${error.message}`);
  shops.push(data);
  return data;
}
const userIdByEmail = async (email) => {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return data?.users?.find((u) => u.email === email)?.id ?? null;
};
const text = async (page) => (await page.locator('main').innerText()).replace(/\s+/g, ' ');
const NO_SELLING = /\b(?:trial|plans?|billing|price|pricing|per month|14 days|subscription|card)\b|\$\d/i;

// ── Philbrook's, before ───────────────────────────────────────────────────────────────────
const philSnap = async () => {
  const { data: s } = await admin.from('shops').select('id, name, join_code').ilike('name', '%philbrook%');
  const ids = (s ?? []).map((x) => x.id);
  const { count: members } = await admin.from('shop_members').select('*', { count: 'exact', head: true }).in('shop_id', ids);
  const { count: reqs } = await admin.from('shop_join_requests').select('*', { count: 'exact', head: true }).in('shop_id', ids);
  return JSON.stringify({ s, members, reqs });
};
const philBefore = await philSnap();

console.log(`\nInvite link verification — ${BASE}\n`);
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const phone = () => browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });

try {
  // ── the shop that sends the invite, with an admin and a department ──────────────────
  await makeUser('admin');
  const adminClient = await signedIn('admin');
  const SHOP_NAME = `ZZ Invite Yard ${STAMP}`;
  const shopId = await provision(adminClient, SHOP_NAME);
  const { data: shopRow } = await admin.from('shops').select('join_code').eq('id', shopId).single();
  const CODE = shopRow.join_code;
  const { data: dept } = await admin.from('shop_departments').insert({ shop_id: shopId, name: 'Rigging' }).select('id').single();
  console.log(`throwaway shop ${shopId}, code ${CODE}\n`);
  const adminNotices = async (userId) => {
    const { data } = await admin
      .from('notifications')
      .select('user_id, type, read_at')
      .eq('shop_id', shopId)
      .eq('type', 'join_requested')
      .eq('target_id', userId);
    return data ?? [];
  };

  // ── the link preview ────────────────────────────────────────────────────────────────
  {
    const html = await (await fetch(`${BASE}/join/${CODE}`, { redirect: 'manual' })).text();
    const og = (p) => html.match(new RegExp(`<meta property="og:${p}" content="([^"]*)"`))?.[1] ?? '';
    check(og('title') === `Join ${SHOP_NAME} on ReFitIQ`, 'link preview: the title names the shop', og('title'));
    check(/\/join\/[^/]+\/opengraph-image\.png/.test(og('image')), 'link preview: the invite card, not the owner pitch', og('image'));
    check(!NO_SELLING.test(og('description')), 'link preview: no trial or price in the description', og('description'));
  }

  // ── A: a brand-new person, signed out ───────────────────────────────────────────────
  console.log('── A: new person, signed out');
  {
    const ctx = await phone();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/join/${CODE}`, { waitUntil: 'networkidle' });
    check((await page.locator('h1').innerText()).trim() === `Join ${SHOP_NAME}`, 'the invite says "Join <shop>"');
    const before = await text(page);
    check(!NO_SELLING.test(before), 'no trial, plan, price or billing on the page', before.match(NO_SELLING)?.[0]);
    check((await page.locator('#shop').count()) === 0 && (await page.locator('#industry').count()) === 0, 'no shop name or trade picker');
    await page.fill('#name', 'ZZ Newcomer');
    await page.fill('#email', emailFor('newcomer'));
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('Request sent'), null, { timeout: 45000 });
    ok('one tap: account made, and the page says "Request sent"');
    const after = await text(page);
    check(after.includes(SHOP_NAME) && !NO_SELLING.test(after), 'the confirmation names the shop and sells nothing');
    const uid = await userIdByEmail(emailFor('newcomer'));
    if (uid) users.push(uid);
    const { data: req } = await admin.from('shop_join_requests').select('shop_id').eq('user_id', uid);
    check(req?.length === 1 && req[0].shop_id === shopId, 'a pending join request for the shop exists');
    const { count: mem } = await admin.from('shop_members').select('*', { count: 'exact', head: true }).eq('user_id', uid);
    check(mem === 0, 'no shop of their own was made, and no membership yet');
    const { data: meta } = await admin.auth.admin.getUserById(uid);
    check(meta?.user?.user_metadata?.display_name === 'ZZ Newcomer', 'the name typed is on the account');
    const notes = await adminNotices(uid);
    check(notes.length === 1 && notes[0].read_at === null, "the shop's admin was notified (0059 join_requested)");
    // The dashboard for a pending joiner: no create-shop, no plan picker.
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    const dash = await text(page);
    check(/Request sent/.test(dash) && !/Create your shop|Choose a plan|Plan, seats and billing/.test(dash), 'the dashboard shows the pending request, no create-shop or plans');
    // The admin accepts, choosing the role and the department.
    const { error: accErr } = await adminClient.rpc('admin_accept_join', { _user_id: uid, _role: 'tech', _department_id: dept.id });
    check(!accErr, 'the admin accepts with role tech and department Rigging', accErr?.message);
    const { data: m } = await admin.from('shop_members').select('shop_id, role, department_id').eq('user_id', uid);
    check(m?.length === 1 && m[0].shop_id === shopId && m[0].role === 'tech' && m[0].department_id === dept.id, 'they are in the shop as tech, in Rigging');
    check((await adminNotices(uid)).every((n) => n.read_at !== null), "the admin's notice is marked read");
    await page.goto(`${BASE}/join/${CODE}`, { waitUntil: 'networkidle' });
    check((await page.locator('h1').innerText()).trim() === `You are in ${SHOP_NAME}`, 'the link now says "You are in <shop>"');
    await ctx.close();
  }

  // ── B: an account with no shop signs in from the invite ────────────────────────────
  console.log('── B: existing account, no shop');
  {
    const uid = await makeUser('returning');
    const ctx = await phone();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/join/${CODE}`, { waitUntil: 'networkidle' });
    await page.click(`text=Sign in to join ${SHOP_NAME}`);
    await page.waitForURL(`**/login?next=*`, { timeout: 30000 });
    const login = await text(page);
    check(/Make one from the invite/.test(login) && !/Start a free trial/.test(login), 'the sign-in page offers the invite, not a trial');
    await page.fill('#email', emailFor('returning'));
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`**/join/${CODE}`, { timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('Request sent'), null, { timeout: 30000 });
    ok('signing in brings them back to the invite, and the request is filed');
    const { data: req } = await admin.from('shop_join_requests').select('shop_id').eq('user_id', uid);
    check(req?.length === 1 && req[0].shop_id === shopId, 'a pending join request exists');
    check((await adminNotices(uid)).length === 1, "the shop's admin was notified");
    const { error: denyErr } = await adminClient.rpc('admin_decline_join', { _user_id: uid });
    check(!denyErr, 'the admin denies it', denyErr?.message);
    const { count } = await admin.from('shop_join_requests').select('*', { count: 'exact', head: true }).eq('user_id', uid);
    check(count === 0, 'the request is gone after Deny');
    await ctx.close();
  }

  // ── C: the 21 Oct trap — an empty trial shop made by mistake ────────────────────────
  console.log('── C: owns an empty trial shop');
  {
    const uid = await makeUser('accidental');
    const c = await signedIn('accidental');
    const shellName = `ZZ Accidental ${STAMP}`;
    const shellId = await provision(c, shellName);
    const ctx = await phone();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login?next=${encodeURIComponent(`/join/${CODE}`)}`, { waitUntil: 'networkidle' });
    await page.fill('#email', emailFor('accidental'));
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`**/join/${CODE}`, { timeout: 30000 });
    const offer = await text(page);
    check((await page.locator('h1').innerText()).trim() === `Join ${SHOP_NAME}` && offer.includes(shellName),
      'instead of "you already belong to a shop", it names the empty shop and offers to join');
    check(!NO_SELLING.test(offer), 'and sells nothing');
    await page.click(`button:has-text("Join ${SHOP_NAME}")`);
    await page.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('Request sent'), null, { timeout: 30000 });
    ok('one tap: request sent');
    const { count: shellLeft } = await admin.from('shops').select('*', { count: 'exact', head: true }).eq('id', shellId);
    check(shellLeft === 0, 'the empty shop is gone (and its trial with it)');
    const { data: req } = await admin.from('shop_join_requests').select('shop_id').eq('user_id', uid);
    check(req?.length === 1 && req[0].shop_id === shopId, 'the request is filed');
    check((await adminNotices(uid)).length === 1, "the shop's admin was notified");
    const { error: accErr } = await adminClient.rpc('admin_accept_join', { _user_id: uid, _role: 'parts', _department_id: null });
    check(!accErr, 'the admin accepts them as parts', accErr?.message);
    const { data: m } = await admin.from('shop_members').select('shop_id, role').eq('user_id', uid);
    check(m?.length === 1 && m[0].shop_id === shopId && m[0].role === 'parts', 'one membership: this shop, parts');
    await ctx.close();
  }

  // ── D: someone in a REAL shop is told so, and nothing changes ───────────────────────
  console.log('── D: belongs to a real shop');
  {
    const uid = await makeUser('owner');
    const c = await signedIn('owner');
    const ownName = `ZZ Real Yard ${STAMP}`;
    const ownId = await provision(c, ownName);
    await admin.from('jobs').insert({ shop_id: ownId, name: 'ZZ boat' });
    const ctx = await phone();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login?next=${encodeURIComponent(`/join/${CODE}`)}`, { waitUntil: 'networkidle' });
    await page.fill('#email', emailFor('owner'));
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`**/join/${CODE}`, { timeout: 30000 });
    const t = await text(page);
    check((await page.locator('h1').innerText()).trim() === 'This account is in another shop' && t.includes(ownName),
      'told which shop the account is in, and how to get out of it');
    const { data: m } = await admin.from('shop_members').select('shop_id').eq('user_id', uid);
    const { count: reqs } = await admin.from('shop_join_requests').select('*', { count: 'exact', head: true }).eq('user_id', uid);
    check(m?.length === 1 && m[0].shop_id === ownId && reqs === 0, 'nothing changed: still in their shop, no request');
    await ctx.close();
  }

  // ── the edges ───────────────────────────────────────────────────────────────────────
  console.log('── edges');
  {
    const ctx = await phone();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/join/NOPE0000`, { waitUntil: 'networkidle' });
    check((await page.locator('h1').innerText()).trim() === 'This invite link is not valid' && (await page.locator('form').count()) === 0,
      'a bad code gets no form');
    const r = await fetch(`${BASE}/signup?join=${CODE}`, { redirect: 'manual' });
    check(r.status >= 300 && r.status < 400 && (r.headers.get('location') ?? '').endsWith(`/join/${CODE}`), 'the old /signup?join= link goes to the invite', `${r.status} ${r.headers.get('location')}`);
    await page.goto(`${BASE}/join/${CODE}`, { waitUntil: 'networkidle' });
    await page.fill('#email', emailFor('owner'));
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.error', { timeout: 30000 });
    const err = await page.locator('.error').innerText();
    check(/already has a ReFitIQ account/.test(err) && /Sign in to join/.test(err), 'an email that has an account is sent to sign in to join');
    await ctx.close();
  }
} catch (e) {
  bad(`aborted: ${e?.message ?? e}`);
} finally {
  // ── TEARDOWN, always ──────────────────────────────────────────────────────────────────
  console.log('\n── teardown');
  await browser.close().catch(() => {});
  for (const id of shops) {
    await admin.from('jobs').delete().eq('shop_id', id); // jobs.shop_id is ON DELETE RESTRICT
    await admin.from('shops').delete().eq('id', id);
  }
  for (const id of users) await admin.auth.admin.deleteUser(id).catch(() => {});
  const leftShops = shops.length ? (await admin.from('shops').select('id').in('id', shops)).data ?? [] : [];
  const { data: all } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const leftUsers = (all?.users ?? []).filter((u) => u.email?.includes(`-${STAMP}@`));
  check(leftShops.length === 0 && leftUsers.length === 0, `teardown: ${shops.length} shops and ${users.length} users removed, nothing left`,
    `shops ${JSON.stringify(leftShops)}, users ${leftUsers.map((u) => u.email).join(', ')}`);
  check((await philSnap()) === philBefore, "Philbrook's rows unchanged");
  console.log(`\n${passed} checks passed${process.exitCode ? ', WITH FAILURES' : ''}.`);
}
