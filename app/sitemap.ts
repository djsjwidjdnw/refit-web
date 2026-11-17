import type { MetadataRoute } from 'next';
import { SITE_PAGES, SITE_URL } from '@/lib/site-content';

// The public pages only. Sign-in, signup, join, the dashboard, ops and auth pages are not
// listed (robots.ts keeps crawlers out of the private ones).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    ...SITE_PAGES.map((p) => ({
      url: `${SITE_URL}${p.href}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: p.href === '/pricing' || p.href === '/how-it-works' ? 0.9 : 0.7,
    })),
    { url: `${SITE_URL}/getting-started`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
