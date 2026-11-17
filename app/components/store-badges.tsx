import { OutboundLink } from '../outbound-link';
import { APP_STORE_URL, PLAY_URL } from '@/lib/stores';

// The official badges (Apple's SVG from developer.apple.com, Google's PNG from
// play.google.com/intl/en_us/badges, its transparent margin cropped so the two read as one
// size), each linking to the real listing. Tracked like every other link that leaves the site.
export function StoreBadges({ className }: { className?: string }) {
  return (
    <div className={`store-badges${className ? ` ${className}` : ''}`}>
      <OutboundLink href={APP_STORE_URL} dest="app-store" className="store-badge">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/badges/app-store-black.svg" alt="Download on the App Store" width={144} height={48} />
      </OutboundLink>
      <OutboundLink href={PLAY_URL} dest="google-play" className="store-badge">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/badges/google-play.png" alt="Get it on Google Play" width={161} height={48} />
      </OutboundLink>
    </div>
  );
}
