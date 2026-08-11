import { MetadataRoute } from 'next'

const SITE_URL = 'https://solprep.app'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/our-story`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/signup`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/blog/welcome-back-2026-2027-school-year`,
      lastModified: new Date('2026-08-11'),
      changeFrequency: 'yearly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/blog/new-practice-tools`,
      lastModified: new Date('2026-05-19'),
      changeFrequency: 'yearly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/blog/summer-fun-learning-activities`,
      lastModified: new Date('2026-05-13'),
      changeFrequency: 'yearly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/blog/your-childs-privacy-on-solprep`,
      lastModified: new Date('2026-04-27'),
      changeFrequency: 'yearly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/blog/how-we-built-solprep-with-ai`,
      lastModified: new Date('2026-04-05'),
      changeFrequency: 'yearly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/blog/how-to-read-sol-score-report`,
      lastModified: new Date('2026-05-05'),
      changeFrequency: 'yearly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/blog/virginia-sol-test-parent-guide`,
      lastModified: new Date('2026-04-11'),
      changeFrequency: 'yearly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/blog/accommodations-for-special-needs-students`,
      lastModified: new Date('2026-04-10'),
      changeFrequency: 'yearly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ]
}
