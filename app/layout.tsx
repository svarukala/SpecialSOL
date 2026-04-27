import type { Metadata } from 'next'
import { Lexend, Geist_Mono } from 'next/font/google'
import { headers } from 'next/headers'
import Script from 'next/script'
import './globals.css'

const lexend = Lexend({
  variable: '--font-lexend',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const SITE_URL = 'https://solprep.app'
const SITE_NAME = 'SolPrep'
const DESCRIPTION =
  'Free Virginia SOL practice using real VDOE released test questions, grades 3–8. Adaptive Math & Reading with IEP/504 accommodations built in — text-to-speech, dyslexia font, extended time, and more.'

const TITLE_DEFAULT = `${SITE_NAME} — Free Virginia SOL Practice with Real VDOE Questions`

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE_DEFAULT,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    // High-intent searches
    'Virginia SOL practice test',
    'free SOL practice test',
    'Virginia SOL practice questions',
    'VDOE released test questions',
    'free Virginia SOL prep',
    'SOL test prep online',
    // VDOE / standards
    'Virginia Standards of Learning',
    'VDOE released tests',
    'Virginia SOL released questions',
    // Subjects
    'Virginia math SOL practice',
    'Virginia reading SOL practice',
    'SOL math practice',
    'SOL reading practice',
    // Grade-specific
    'grade 3 SOL practice',
    'grade 4 SOL practice',
    'grade 5 SOL practice',
    'grade 6 SOL practice',
    'grade 7 SOL practice',
    'grade 8 SOL practice',
    // IEP / special needs / accommodations
    'SOL prep for kids with IEP',
    'SOL prep for kids with 504 plan',
    'special needs SOL practice',
    'dyslexia SOL practice',
    'SOL accommodations',
    'text-to-speech SOL practice',
    // Adaptive / differentiated
    'adaptive SOL practice',
    'differentiated SOL practice',
    'below grade level SOL prep',
    // Brand & general
    'SolPrep',
    'Virginia SOL test prep',
    'SOL practice',
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: TITLE_DEFAULT,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE_DEFAULT,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: SITE_URL,
  },
  other: {
    'msvalidate.01': '26CCFAFD462B115782D9F2BF67A9257E',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? ''
  return (
    <html lang="en" className={`${lexend.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Script nonce={nonce} src="https://www.googletagmanager.com/gtag/js?id=G-LTDBK0L31S" strategy="afterInteractive" />
        <Script nonce={nonce} id="gtag-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-LTDBK0L31S');
        `}</Script>
      </body>
    </html>
  )
}
