'use client';

// The one long page had in-page sections that ads, emails and old links point at
// ("refit-iq.com/#how"). A fragment never reaches the server, so this sends each old anchor
// to the page that section became (Jon, 17 Nov 2026). Anything else is left alone.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const MOVED: Record<string, string> = {
  '#how': '/how-it-works',
  '#how-it-works': '/how-it-works',
  '#features': '/features',
  '#trades': '/industries',
  '#industries': '/industries',
  '#pricing': '/pricing',
  '#faq': '/pricing#faq',
  '#roi': '/pricing#roi',
  '#about': '/about',
  '#contact': '/contact',
};

export function HashRedirect() {
  const router = useRouter();
  useEffect(() => {
    const to = MOVED[window.location.hash.toLowerCase()];
    if (to) router.replace(to);
  }, [router]);
  return null;
}
