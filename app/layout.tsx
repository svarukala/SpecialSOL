import type { Metadata } from 'next'
import { Lexend, Geist_Mono } from 'next/font/google'
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
  'Free Virginia SOL test prep for grades 3–8. Adaptive practice with built-in accommodations — text-to-speech, dyslexia font, extended time, and more. Math & Reading.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Virginia SOL Test Prep for Every Learner`,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    'Virginia SOL test prep',
    'SOL practice',
    'Virginia Standards of Learning',
    'SOL accommodations',
    'special needs SOL',
    'dyslexia SOL practice',
    'foundational SOL',
    'grade 3 SOL',
    'grade 4 SOL',
    'grade 5 SOL',
    'grade 6 SOL',
    'grade 7 SOL',
    'grade 8 SOL',
    'Virginia math SOL',
    'Virginia reading SOL',
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Virginia SOL Test Prep for Every Learner`,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Virginia SOL Test Prep for Every Learner`,
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
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lexend.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-LTDBK0L31S" strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-LTDBK0L31S');
        `}</Script>
      </body>
    </html>
  )
}
