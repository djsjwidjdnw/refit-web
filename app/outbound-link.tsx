'use client';

import { trackFunnel } from '@/lib/analytics';

// A tracked link that leaves the site. Deliberately NOT CtaLink: CtaLink exists to feed
// the signup funnel and unconditionally appends ?src= to its href, which would be
// nonsense on an external URL — and its event says a conversion was attempted, which
// this is the opposite of.
//
// The only current use is the App Store listing in the proof strip. That link is a real
// leak on paid traffic, and it is here anyway because "there is a shipping app with a
// public listing" is the one claim a skeptic can verify himself in five seconds. Keeping
// it instrumented means the decision to keep or pull it can be made from the funnel
// rather than from an opinion.
export function OutboundLink({
  href,
  dest,
  children,
  className,
}: {
  href: string;
  /** Short label for the destination, e.g. 'app-store'. Becomes the event property. */
  dest: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackFunnel('outbound_click', { dest })}
    >
      {children}
    </a>
  );
}
