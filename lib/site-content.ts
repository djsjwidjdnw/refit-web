// The marketing site's shared content (Jon, 17 Nov 2026: the one long page became several).
// Pages import from here so a claim is written once. House style (app/(site)/page.tsx header):
// plain words, Canadian spelling, no em dashes, nothing the app does not do today.
import { createPublicClient } from '@/lib/supabase/public';
import { PRIVACY_URL } from '@/lib/stores';

export const SUPPORT_EMAIL = 'support@refit-iq.com';
export const ACCOUNT_DELETION_URL = `${PRIVACY_URL}#account-deletion`;
export const SITE_URL = 'https://refit-iq.com';

/** The site's pages, in menu order. */
export const SITE_PAGES = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/features', label: 'Features' },
  { href: '/industries', label: 'Industries' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/get-the-app', label: 'Get the app' },
  { href: '/stickers', label: 'Stickers' },
  { href: '/contact', label: 'Contact' },
] as const;

// ── pricing: billing_plans (0027), the table checkout charges from ─────────────────────────
// Read at most once per revalidate window. The fallback is the same locked catalogue
// (lib/stripe/plans.ts PLAN_CATALOG), checked against billing_plans on 17 Nov 2026.
export type Tier = {
  plan: string;
  display_name: string;
  price_usd_monthly: number | null;
  seats_included: number | null;
  active_job_limit: number | null;
  max_shops: number | null;
  sort_order: number;
};

const FALLBACK_TIERS: Tier[] = [
  { plan: 'lite', display_name: 'Lite', price_usd_monthly: 99, seats_included: 5, active_job_limit: 15, max_shops: 1, sort_order: 1 },
  { plan: 'pro', display_name: 'Pro', price_usd_monthly: 179, seats_included: 10, active_job_limit: 40, max_shops: 1, sort_order: 2 },
  { plan: 'max', display_name: 'Max', price_usd_monthly: 299, seats_included: 20, active_job_limit: 150, max_shops: 3, sort_order: 3 },
  { plan: 'enterprise', display_name: 'Enterprise', price_usd_monthly: null, seats_included: null, active_job_limit: null, max_shops: null, sort_order: 4 },
];

export async function getTiers(): Promise<Tier[]> {
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from('billing_plans')
      .select('plan, display_name, price_usd_monthly, seats_included, active_job_limit, max_shops, sort_order')
      .order('sort_order');
    if (data && data.length) {
      return (data as Tier[]).map((t) => ({ ...t, price_usd_monthly: t.price_usd_monthly == null ? null : Number(t.price_usd_monthly) }));
    }
  } catch {
    // table not readable here: the locked pricing below
  }
  return FALLBACK_TIERS;
}

export const ADDON_SEAT_USD = 15;
export const TRIAL_DAYS = 14;

// ── How it works: the eight screenshots (Jon's package, website-copy.json) ───────────────
// Headings and captions as supplied, with Jon's two edits ("organized"; "Know who did what,
// and when") and no em dashes. Images are cut by scripts/make-how-it-works-shots.mjs:
// status bars cropped; names, the overdue line and "No one assigned" lines blurred.
export const HOW_SHOTS = [
  {
    name: '01-jobs', w1: 480, w2: 960, full: [1206, 2452],
    heading: 'Every job within reach',
    copy: 'Search by boat name, owner, or work order, pin key projects, and see recorded item counts and deadlines at a glance.',
    alt: 'ReFitIQ jobs overview showing pinned projects, capture counts and due dates.',
  },
  {
    name: '02-project', w1: 480, w2: 721, full: [721, 1468],
    heading: 'Keep the whole project organized',
    copy: 'Find parts, focus on urgent work, filter by area or department, and access the tools your team needs from one project screen.',
    alt: 'ReFitIQ project dashboard with part records, area and department filters, and QR scan access.',
  },
  {
    name: '03-gallery', w1: 330, w2: 660, full: [706, 1436],
    heading: 'Find the right part visually',
    copy: 'Browse project photos, filter by area, and search recorded details without scrolling through an unorganized camera roll.',
    alt: 'ReFitIQ searchable project photo gallery with labelled parts and area filters.',
  },
  {
    name: '04-part-photos', w1: 330, w2: 660, full: [706, 1436],
    heading: 'See where it came from and how it fits',
    copy: 'Keep location photos and close-up details together to help technicians reinstall with confidence.',
    alt: 'ReFitIQ part photo viewer showing a mast location image and a vent-cover thumbnail.',
  },
  {
    name: '05-part-plan', w1: 480, w2: 960, full: [1206, 2452],
    heading: 'Give every part a clear plan',
    copy: 'Identify its location, define the work required, and flag urgent items so your team knows what happens next.',
    alt: 'ReFitIQ part details with QR reference, technician attribution and remove-and-reinstall instructions.',
  },
  {
    name: '06-fasteners', w1: 480, w2: 960, full: [1206, 2452],
    heading: 'Keep the small details from becoming big delays',
    copy: 'Record fastener specifications, flag replacements, and keep installation references and supporting media with the part.',
    alt: 'ReFitIQ fastener record showing screw specifications, replacement status, storage notes and drill references.',
  },
  {
    name: '07-history', w1: 480, w2: 960, full: [1206, 2452],
    heading: 'Know who did what, and when',
    copy: 'Keep technician notes, condition details, and removal-to-reinstallation history together with every part.',
    alt: 'ReFitIQ part history showing dated removal and installation entries attributed to technicians.',
  },
  {
    // Not "191 screws": the header count's unit is not established by the screen.
    name: '08-replacements', w1: 480, w2: 960, full: [1206, 2452],
    heading: 'Bring replacement requirements into one list',
    copy: 'Review replacement fastener totals, trace them back to individual parts, and track what has been ordered.',
    alt: 'ReFitIQ replacement fastener list showing quantities, source part references and ordered checkboxes.',
  },
] as const;

export const FAQ = [
  {
    q: 'What does the trial cost?',
    a: 'Nothing. Fourteen days with every feature switched on and every tech on your crew. You are not billed during it, and you are not billed after it unless you pick a plan. Signing up takes a shop name, a work email and a password.',
  },
  {
    q: 'How many techs can I add during the trial?',
    a: 'All of them. Seats are unlimited for the 14 days, so you never have to pick a plan just to try it properly. Afterwards the owner or admin seat is free on every plan.',
  },
  {
    q: 'Does it work where there is no signal?',
    a: 'Yes. Capture runs offline and syncs when the phone is back on a connection, which is the normal case in a shed, in a back bay or under a hull. You can also download a whole job, or one area of it, to open with no signal at all.',
  },
  {
    q: 'Do we have to buy QR labels?',
    a: 'No. You can scan a QR code or barcode if you already use them, or let ReFitIQ auto-number each bag. Both work the same way afterwards.',
  },
  {
    q: 'Can I control who sees which job?',
    a: 'Yes. Admins, team leads, techs and parts staff are separate roles, and techs and team leads only see the jobs they are assigned to.',
  },
  {
    q: 'What happens to the record if we stop paying?',
    a: 'Nothing is deleted. The shop goes read-only, and you can still open and export every job with the photos attached. The export is a plain file you keep. It opens without ReFitIQ.',
  },
  {
    q: 'How long before the crew is using it?',
    a: 'It is a phone app with a camera and a job list. The first capture takes about a minute. There is no implementation project.',
  },
] as const;
