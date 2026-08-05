'use client';

import { track } from '@vercel/analytics';

// Funnel instrumentation for ad traffic.
//
// Two layers, because they have different plan requirements:
//
//   1. PAGEVIEWS (<Analytics/> in app/layout.tsx) work on every Vercel plan including
//      Hobby. Because each funnel stage is its own route, the pageview counts alone
//      already give landing (/) -> signup (/signup) -> shop (/dashboard).
//   2. CUSTOM EVENTS (the track() calls below) add the stages a route change can't see —
//      which CTA was clicked, whether the form was submitted vs. abandoned, and whether
//      provisioning actually succeeded. Vercel only records custom events on Pro and
//      above; on Hobby these calls are harmless no-ops, so shipping them costs nothing
//      and they light up the moment the plan is upgraded.
//
// Cookieless and no personal data: never pass an email, shop name, or user id here.

export type FunnelEvent =
  | 'cta_click'
  // A tap that leaves the site on purpose (today: the App Store listing, offered as
  // proof that the app is real). Tracked because a link that sends paid traffic away
  // has to be measurable — if it costs more signups than the proof is worth, the
  // number to justify pulling it should already be in the dashboard.
  | 'outbound_click'
  | 'signup_started'
  | 'signup_submitted'
  | 'signup_failed'
  | 'shop_created'
  | 'join_requested'
  | 'trial_active';

type Props = Record<string, string | number | boolean | null>;

export function trackFunnel(event: FunnelEvent, props?: Props) {
  try {
    track(event, props);
  } catch {
    // Analytics must never take the page down with it.
  }
}

// Reads the ?src= that the landing-page CTAs attach, so a signup can be attributed to the
// CTA that produced it even though every CTA lands on the same route.
export function ctaSource(): string {
  if (typeof window === 'undefined') return 'unknown';
  return new URLSearchParams(window.location.search).get('src') ?? 'direct';
}
