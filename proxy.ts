import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SUPABASE_HOST = 'https://cpcsxocziapgqpbtfytr.supabase.co'

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://lh3.googleusercontent.com https://www.google-analytics.com`,
    `font-src 'self'`,
    `connect-src 'self' ${SUPABASE_HOST} https://www.google-analytics.com https://analytics.google.com https://vitals.vercel-insights.com`,
    `frame-src 'none'`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self' https://accounts.google.com`,
    `upgrade-insecure-requests`,
  ].join('; ')

  // Forward nonce to server components via request header
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|otf|ttf|woff|woff2)).*)',
  ],
}
