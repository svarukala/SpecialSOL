import { MetadataRoute } from 'next'

const SITE_URL = 'https://solprep.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/signup'],
        disallow: ['/dashboard', '/children/', '/settings', '/feedback', '/admin/', '/practice/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
