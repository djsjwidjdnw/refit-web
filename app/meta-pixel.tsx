'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

// Meta Pixel, so ad campaigns can be optimised on signups instead of clicks. Additional
// to Vercel Analytics, not a replacement — trackFunnel in lib/analytics.ts is ours,
// this one exists for Meta's delivery system.
//
// Unlike <Analytics/>, this is NOT cookieless: fbevents.js sets the _fbp cookie (and
// _fbc when the landing URL carries an fbclid). The "cookieless" note in app/layout.tsx
// stays true of Vercel Analytics only.
//
// PageView is fired from the pathname effect below, NOT from a base-snippet call: the
// App Router navigates client-side, so a load-time-only PageView would count each visitor
// once no matter how many pages they walk through, and firing from both the snippet and
// the effect would double-count every landing. One effect is the single source.
//
// usePathname only, deliberately no useSearchParams: reading search params in a root
// layout component forces a Suspense boundary and de-statics every page, and no route
// here navigates client-side on a query-string change alone (the ?src= CTAs all land on
// /signup from another pathname).

const META_PIXEL_ID = '1022060564000589';

// Only the live site feeds the pixel. localhost and preview deployments would otherwise
// pollute the exact dataset Meta optimises delivery on — and since .env.local points
// `next dev` at the production DB, "just testing signup locally" would mint a real
// CompleteRegistration that nothing can ever retract.
const PIXEL_HOSTS = new Set(['refit-iq.com', 'www.refit-iq.com']);

function onPixelHost(): boolean {
  return typeof window !== 'undefined' && PIXEL_HOSTS.has(window.location.hostname);
}

// Every event fbevents.js sends carries dl = the full current URL — fragment included —
// so URLs that can carry secrets must never produce an event:
//   /auth/*        — admin-minted rescue links land on /auth/auth-code-error with live
//                    #access_token/#refresh_token still in the fragment until
//                    setSession's round trip resolves (auth-code-error-client.tsx strips
//                    it only after, and not at all on its error branch).
//   /join/*, ?join= — shop invite codes are capability tokens; they appear in the
//                    pathname for signed-in users and in the query after the signed-out
//                    redirect to /signup?join=<code>.
//   /ops/*         — operator cockpit; customer shop UUIDs in paths, zero ad value.
// The hash test is belt-and-braces for a token fragment landing anywhere else (GoTrue
// falls back to the Site URL root if a redirect_to is ever dropped).
function blockedContext(pathname: string): boolean {
  if (pathname.startsWith('/auth') || pathname.startsWith('/ops') || pathname.startsWith('/join'))
    return true;
  if (/(access|refresh)_token=/.test(window.location.hash)) return true;
  if (new URLSearchParams(window.location.search).has('join')) return true;
  return false;
}

type FbqArgs = unknown[];
interface Fbq {
  (...args: FbqArgs): void;
  callMethod?: (...args: FbqArgs) => void;
  queue: FbqArgs[];
  push: Fbq;
  loaded: boolean;
  version: string;
}

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

// Meta's queueing stub (the first half of their base snippet), in TypeScript. Calls made
// before fbevents.js finishes loading are queued and flushed by the library, so track()
// is safe to call from anywhere without waiting on the script.
function ensureFbq(): Fbq | null {
  if (typeof window === 'undefined') return null;
  if (window.fbq) return window.fbq;
  const stub = ((...args: FbqArgs) => {
    if (stub.callMethod) stub.callMethod(...args);
    else stub.queue.push(args);
  }) as Fbq;
  stub.queue = [];
  stub.push = stub;
  stub.loaded = true;
  stub.version = '2.0';
  window.fbq = stub;
  if (!window._fbq) window._fbq = stub;
  return stub;
}

// The only two events we send. Like trackFunnel, this must never take the page down,
// and never carries an email, shop name, or user id.
export function trackMeta(event: 'PageView' | 'CompleteRegistration') {
  try {
    if (!onPixelHost()) return;
    ensureFbq()?.('track', event);
  } catch {
    /* analytics must never break the page */
  }
}

// Module-level, not state: survives re-renders, resets on a full page load (where one
// fresh PageView is exactly right), and makes dev StrictMode's double-run of the effect
// a no-op instead of a double count.
let initialized = false;
let lastPathTracked: string | null = null;

export function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    // fbevents.js references the global `fbq` unconditionally when it executes, so the
    // stub must exist on every host — it queues and sends nothing unless init'd below.
    ensureFbq();
    if (!onPixelHost()) return;
    if (!initialized) {
      initialized = true;
      try {
        const fbq = ensureFbq();
        // Automatic config OFF, before init: no Events-Manager-driven behavior changes,
        // no automatic button/microdata events, and Automatic Advanced Matching can
        // never start hashing the signup email out of the form via a dashboard toggle —
        // the no-PII rule stays enforced in code, not in a setting nobody diffs.
        fbq?.('set', 'autoConfig', false, META_PIXEL_ID);
        fbq?.('init', META_PIXEL_ID);
      } catch {
        /* ditto */
      }
    }
    if (pathname === lastPathTracked) return;
    lastPathTracked = pathname;
    if (blockedContext(pathname)) return;
    trackMeta('PageView');
  }, [pathname]);

  // The Script/noscript render on every host unconditionally — gating them on
  // window.location would make server and client render different trees (hydration
  // mismatch). Off the live host the script simply loads and is never init'd, so
  // nothing is ever sent. The noscript img carries no URL (dl) and no referrer.
  return (
    <>
      <Script
        id="meta-pixel"
        src="https://connect.facebook.net/en_US/fbevents.js"
        strategy="afterInteractive"
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          referrerPolicy="no-referrer"
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
