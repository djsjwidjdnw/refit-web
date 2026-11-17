import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-content';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/ops', '/auth/', '/api/', '/join/', '/reset-password'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
