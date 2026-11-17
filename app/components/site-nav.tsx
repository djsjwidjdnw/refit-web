'use client';

// The site's top bar (Jon, 17 Nov 2026).
//
// Desktop (900px and up): logo (home), the page links, "Sign in" and a primary "Start free
// trial". The current page is marked (aria-current="page", and underlined).
//
// Phone: logo and a menu button. The button is a real <button> with aria-expanded and
// aria-controls; it opens a full-height panel with the same links. While it is open:
//   - focus stays inside it (Tab and Shift+Tab wrap), and goes back to the button on close;
//   - Escape closes it, and so does tapping the dimmed page beside it;
//   - the page behind does not scroll (and nothing shifts: the scrollbar gutter is reserved
//     in globals.css, so locking scroll does not change the page width);
//   - it closes on navigation.
// Every target is at least 44px. Without JavaScript the button cannot do anything, so a
// <noscript> row of plain links stands in for the menu.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { BrandMark } from '../brand-mark';
import { CtaLink } from '../cta-link';
import { SITE_PAGES } from '@/lib/site-content';

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  // Close on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // While open: lock the page's scroll, trap focus, Escape closes.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    html.classList.add('menu-open');
    const panel = panelRef.current;
    const focusables = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      html.classList.remove('menu-open');
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  return (
    <>
    <header className="site-header">
      <div className="container site-bar">
        <Link href="/" className="site-logo" aria-label="ReFitIQ home">
          <BrandMark lockup="compact" height={26} priority />
        </Link>

        <nav className="site-links" aria-label="Main">
          {SITE_PAGES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="site-link"
              aria-current={isCurrent(pathname, p.href) ? 'page' : undefined}
            >
              {p.label}
            </Link>
          ))}
        </nav>

        <div className="site-actions">
          <Link href="/login" className="site-signin">
            Sign in
          </Link>
          <CtaLink src="nav" className="btn btn-primary site-trial">
            Start free trial
          </CtaLink>
          <button
            ref={buttonRef}
            type="button"
            className="site-menu-button"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => (open ? close() : setOpen(true))}
          >
            <span className="site-burger" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      <noscript>
        <nav className="container site-noscript" aria-label="Main">
          {SITE_PAGES.map((p) => (
            <a key={p.href} href={p.href}>
              {p.label}
            </a>
          ))}
          <a href="/login">Sign in</a>
          <a href="/signup?src=nav">Start free trial</a>
        </nav>
      </noscript>
    </header>

      {/* OUTSIDE the header on purpose: the header's backdrop-filter makes it the containing
          block for position:fixed children, which shrank this layer (and its backdrop) to the
          60px bar. As a sibling it covers the screen. */}
      <div className={`site-menu-layer${open ? ' is-open' : ''}`} hidden={!open}>
        <div className="site-menu-backdrop" onClick={() => close()} aria-hidden="true" />
        <div
          ref={panelRef}
          id={menuId}
          className="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div className="site-menu-top">
            <Link href="/" className="site-logo" aria-label="ReFitIQ home" onClick={() => close(false)}>
              <BrandMark lockup="compact" height={24} />
            </Link>
            <button type="button" className="site-menu-close" aria-label="Close menu" onClick={() => close()}>
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <nav aria-label="Main">
            <ul className="site-menu-list">
              {SITE_PAGES.map((p) => (
                <li key={p.href}>
                  <Link
                    href={p.href}
                    aria-current={isCurrent(pathname, p.href) ? 'page' : undefined}
                    onClick={() => close(false)}
                  >
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="site-menu-actions">
            <Link href="/login" className="btn btn-ghost btn-block" onClick={() => close(false)}>
              Sign in
            </Link>
            <CtaLink src="menu" className="btn btn-primary btn-block">
              Start free trial
            </CtaLink>
          </div>
        </div>
      </div>
    </>
  );
}
