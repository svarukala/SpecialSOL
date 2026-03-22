import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

const openDyslexic = localFont({
  src: [
    { path: '../public/fonts/OpenDyslexic/OpenDyslexic-Regular.otf', weight: '400', style: 'normal' },
    { path: '../public/fonts/OpenDyslexic/OpenDyslexic-Bold.otf', weight: '700', style: 'normal' },
  ],
  variable: '--font-dyslexic',
  display: 'swap',
  // Font may not exist yet — next/font/local handles missing files gracefully in dev
})

export const metadata: Metadata = {
  title: 'SOL Practice',
  description: 'Virginia SOL practice for kids with special needs',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${openDyslexic.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
