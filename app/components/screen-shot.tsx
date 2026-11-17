// One app screenshot in a phone frame: AVIF and WebP at its 1x and 2x display widths, lazy
// below the fold, and a link to the whole screen at full size (works without JavaScript).
export function ScreenShot({
  name,
  w1,
  w2,
  full,
  alt,
  eager = false,
}: {
  name: string;
  w1: number;
  w2: number;
  full: readonly [number, number] | number[];
  alt: string;
  eager?: boolean;
}) {
  const h1 = Math.round((full[1] / full[0]) * w1);
  return (
    <a className="phone-frame" href={`/how/${name}-full.webp`} aria-label={`${alt} Open full size.`}>
      <picture>
        <source type="image/avif" srcSet={`/how/${name}-${w1}.avif 1x, /how/${name}-${w2}.avif 2x`} />
        <source type="image/webp" srcSet={`/how/${name}-${w1}.webp 1x, /how/${name}-${w2}.webp 2x`} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/how/${name}-${w1}.webp`}
          alt={alt}
          width={w1}
          height={h1}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
        />
      </picture>
    </a>
  );
}
