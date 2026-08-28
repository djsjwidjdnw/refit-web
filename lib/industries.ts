// lib/industries.ts — the trades a shop can pick at signup.
//
// GATED ON PURPOSE. This list is not "every trade we would like to sell to", it is "every
// trade that has a finished terminology pack in the app". Offering a trade here that has no
// pack in hardware-memory/lib/industry would let someone pick "Aviation" and then land in a
// boat glossary, which is worse than not offering it at all.
//
// ── ADDING A TRADE ──────────────────────────────────────────────────────────────────────
//   1. Ship the app pack first (hardware-memory/lib/industry/<trade>.ts).
//   2. Widen the CHECK constraint on public.shops.industry in a new migration.
//   3. Then add the row below. In that order, never the other way round: the constraint
//      rejects an unknown value, so a picker that runs ahead of the migration fails signup.
//
// The `value` strings must match the app's IndustryId union and the CHECK constraint
// exactly. The server also normalises and falls back to 'marine' on anything it does not
// recognise (see provision_new_shop_v2 in migration 0048), so a mismatch degrades to marine
// rather than to an error — but it is still a mismatch, so keep them in step.

export type IndustryValue = 'marine' | 'automotive' | 'construction';

export type IndustryOption = {
  value: IndustryValue;
  label: string;
  /** Shown under the picker so the choice is concrete rather than a category name. */
  hint: string;
  /** Example shop name for the field above it, so the placeholder fits the trade. */
  shopExample: string;
};

export const INDUSTRY_OPTIONS: IndustryOption[] = [
  {
    value: 'marine',
    label: 'Marine',
    hint: 'Boats and vessels. Areas like foredeck and flybridge, and 316 stainless on the fastener list.',
    shopExample: 'e.g. Bradshaw Marine',
  },
  {
    value: 'automotive',
    label: 'Automotive',
    hint: 'Cars and trucks. Areas like engine bay and undercarriage, and grade 5 and 8 on the fastener list.',
    shopExample: 'e.g. Bradshaw Restorations',
  },
  {
    value: 'construction',
    label: 'Construction equipment',
    hint: 'Excavators, loaders and dozers. Areas like undercarriage and boom, and hydraulic fittings, hoses and bucket pins alongside the fasteners.',
    shopExample: 'e.g. Bradshaw Plant Services',
  },
];

/** The default, and what the database stores for every shop that existed before 0048. */
export const DEFAULT_INDUSTRY: IndustryValue = 'marine';

export function isIndustryValue(v: unknown): v is IndustryValue {
  return INDUSTRY_OPTIONS.some((o) => o.value === v);
}

export function industryOption(v: unknown): IndustryOption {
  return (
    INDUSTRY_OPTIONS.find((o) => o.value === v) ??
    INDUSTRY_OPTIONS.find((o) => o.value === DEFAULT_INDUSTRY)!
  );
}
