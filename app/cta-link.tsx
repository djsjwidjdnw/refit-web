'use client';

import Link from 'next/link';
import { trackFunnel } from '@/lib/analytics';

// The landing page is a server component (it reads live pricing), so the CTA click event
// needs its own client boundary. Each CTA carries a `src` that becomes both the ?src=
// query param and the event property, so the funnel can show WHICH call to action
// produced a signup — hero, sticky bar, pricing tier, closer — not just that one did.
export function CtaLink({
  src,
  children,
  className = 'btn btn-primary',
  href = '/signup',
}: {
  src: string;
  children: React.ReactNode;
  className?: string;
  href?: string;
}) {
  const target = `${href}${href.includes('?') ? '&' : '?'}src=${encodeURIComponent(src)}`;
  return (
    <Link
      href={target}
      className={className}
      onClick={() => trackFunnel('cta_click', { src })}
      data-cta={src}
    >
      {children}
    </Link>
  );
}
