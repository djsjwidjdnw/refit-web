'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { trackFunnel } from '@/lib/analytics';

// Phone-only persistent CTA. The landing page is ~8,600px tall on a 390px phone, so
// between the hero CTA (~505px) and the pricing CTAs (~7,000px) a visitor can scroll for
// a very long time with no way to act. This bar fills that gap.
//
// It stays out of the way wherever the page already offers a button: hidden until the
// hero CTA has scrolled off (that one is above the fold, so showing both is clutter), and
// hidden again whenever ANY on-page CTA band is in view — the two mid-page bands and the
// closing card — so there are never two competing buttons on screen.
export function StickyCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.querySelector('[data-cta="hero"]');
    if (!hero) return;
    const stops = Array.from(document.querySelectorAll('[data-sticky-stop]'));

    let heroVisible = true;
    const visibleStops = new Set<Element>();
    const apply = () => setShow(!heroVisible && visibleStops.size === 0);

    const heroObs = new IntersectionObserver(([e]) => {
      heroVisible = e.isIntersecting;
      apply();
    });
    heroObs.observe(hero);

    const stopObs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visibleStops.add(e.target);
        else visibleStops.delete(e.target);
      }
      apply();
    });
    stops.forEach((s) => stopObs.observe(s));

    return () => {
      heroObs.disconnect();
      stopObs.disconnect();
    };
  }, []);

  return (
    <div className={`sticky-cta${show ? ' on' : ''}`} aria-hidden={!show}>
      <div className="sticky-cta-inner">
        <div className="sticky-cta-copy">
          <strong>14 days free</strong>
          <span>Cancel anytime</span>
        </div>
        {/* Must stay identical to the CTA label on the page itself. A bar that follows
            the reader down 12,000px saying something different from the buttons beside it
            reads as two different offers. */}
        <Link
          href="/signup?src=sticky"
          className="btn btn-primary"
          tabIndex={show ? undefined : -1}
          onClick={() => trackFunnel('cta_click', { src: 'sticky' })}
        >
          Start your free trial
        </Link>
      </div>
    </div>
  );
}
