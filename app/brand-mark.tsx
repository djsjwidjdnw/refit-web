import Image from 'next/image';
import Link from 'next/link';

// The ReFitIQ mark. One definition, six call sites — the wordmark used to be
// `Re<span>Fit</span>` typed out by hand in every header, which is how the site
// ended up with a text wordmark while the app shipped an actual logo.
//
// Three lockups, cut from the two source files:
//   'long'    — boat beside REFITIQ over the tagline, 4.92:1. Needs ~40px of height
//               before the tagline stops being mush; good for hero-scale moments.
//   'compact' — the same lockup with the tagline band cropped off, 6.75:1. The right
//               choice for anything nav-sized, because the wordmark gets the whole
//               height instead of sharing it with two-pixel type.
//   'mark'    — stacked boat over ReFitIQ, 2.05:1, no tagline. Tight columns.
//
// All three carry an alpha channel — the black they were drawn on is keyed out by
// scripts/make-brand-assets.mjs — so they sit on --bg (#0e0e10) and on the OG card's
// warm glow without showing a black rectangle around the art.

const ART = {
  long: { src: '/brand/logo-long.png', w: 560, h: 114 },
  compact: { src: '/brand/logo-compact.png', w: 560, h: 83 },
  mark: { src: '/brand/logo-mark.png', w: 360, h: 176 },
} as const;

export function BrandMark({
  lockup = 'long',
  height = 30,
  href,
  priority = false,
  className,
}: {
  lockup?: keyof typeof ART;
  /** Rendered height in px; width follows the art's own aspect ratio. */
  height?: number;
  /** Wrap in a link. Omit for a non-navigating mark. */
  href?: string;
  priority?: boolean;
  className?: string;
}) {
  const art = ART[lockup];
  const width = Math.round((art.w / art.h) * height);

  const img = (
    <Image
      src={art.src}
      alt="ReFitIQ"
      width={width}
      height={height}
      priority={priority}
      // The slot is a fixed px height at every breakpoint, so hand Next the
      // exact rendered width rather than letting it guess viewport-relative
      // candidates it can never use.
      sizes={`${width}px`}
      // `height` is the DEFAULT, expressed as a CSS custom property rather than a
      // fixed inline height — an inline height wins over any stylesheet rule, and
      // the nav mark has to shrink at the mobile breakpoint. A class can override
      // --brand-h; it could never have overridden `style={{ height }}`.
      style={
        { display: 'block', height: 'var(--brand-h)', width: 'auto', '--brand-h': `${height}px` } as React.CSSProperties
      }
      className={className}
    />
  );

  if (!href) return img;
  return (
    <Link href={href} aria-label="ReFitIQ home" style={{ display: 'inline-flex' }}>
      {img}
    </Link>
  );
}
