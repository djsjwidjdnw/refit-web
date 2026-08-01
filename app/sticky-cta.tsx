'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { trackFunnel } from '@/lib/analytics';

// Phone-only persistent CTA. The landing page is ~8,600px tall on a 390px phone, so
// between the hero CTA (~505px) and the pricing CTAs (~7,000px) a visitor can scroll for
// a very long time with no way to act. This bar fills that gap.
//
// It stays out of the way at both ends: hidden until the hero CTA has scrolled off (the
// hero one is already above the fold, so showing both is just clutter), and hidden again
// once the closing CTA is on screen so there are never two competing buttons.
export function StickyCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.querySelector('[data-cta="hero"]');
    const closer = document.querySelector('[data-sticky-stop]');
    if (!hero) return;

    const state = { heroVisible: true, closerVisible: false };
    const apply = () => setShow(!state.heroVisible && !state.closerVisible);

    const heroObs = new IntersectionObserver(
      ([e]) => {
        state.heroVisible = e.isIntersecting;
        apply();
      },
      { rootMargin: '0px' },
    );
    heroObs.observe(hero);

    let closerObs: IntersectionObserver | undefined;
    if (closer) {
      closerObs = new IntersectionObserver(
        ([e]) => {
          state.closerVisible = e.isIntersecting;
          apply();
        },
        { rootMargin: '0px' },
      );
      closerObs.observe(closer);
    }

    return () => {
      heroObs.disconnect();
      closerObs?.disconnect();
    };
  }, []);

  return (
    <div className={`sticky-cta${show ? ' on' : ''}`} aria-hidden={!show}>
      <div className="sticky-cta-inner">
        <div className="sticky-cta-copy">
          <strong>14 days free</strong>
          <span>No credit card</span>
        </div>
        <Link
          href="/signup?src=sticky"
          className="btn btn-primary"
          tabIndex={show ? undefined : -1}
          onClick={() => trackFunnel('cta_click', { src: 'sticky' })}
        >
          Start free trial
        </Link>
      </div>
    </div>
  );
}
