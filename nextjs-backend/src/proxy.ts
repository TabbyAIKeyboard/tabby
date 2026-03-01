import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Patterns and domains that are allowed to make cross-origin requests
const LOCALHOST_PATTERN = /^http:\/\/localhost:\d+$/
const FILE_PROTOCOL_PATTERN = /^file:\/\//

// Explicit allowlist for production domains
// Add your production frontend URLs here
const ALLOWED_ORIGINS: string[] = [
  // Add any specific production origins here, e.g.:
  // "https://your-frontend.vercel.app",
  // "https://your-custom-domain.com",
]

function isAllowedOrigin(origin: string): boolean {
  // Allow localhost (any port) for development
  if (LOCALHOST_PATTERN.test(origin)) {
    return true
  }

  // Allow file:// protocol (Electron app in development/production)
  if (FILE_PROTOCOL_PATTERN.test(origin)) {
    return true
  }

  // Allow "null" origin - sent by Electron apps when packaged,
  // file:// origins, and some redirect scenarios
  if (origin === 'null') {
    return true
  }

  // Allow explicitly listed production origins
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true
  }

  return false
}

function getAllowOriginValue(origin: string): string {
  // For "null" origin (Electron packaged apps), we need to echo "null" back
  // For file:// or no origin, we can't echo it back for credentials,
  // but we can allow it by not setting the header (or setting to the origin if present)
  if (origin === 'null' || FILE_PROTOCOL_PATTERN.test(origin)) {
    // When credentials are needed with "null" origin, we echo "null"
    return origin
  }
  return origin
}

export async function proxy(request: NextRequest) {
  const origin = request.headers.get('origin') || ''
  const allowed = isAllowedOrigin(origin)

  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 })
    if (allowed && origin) {
      response.headers.set('Access-Control-Allow-Origin', getAllowOriginValue(origin))
    }
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    )
    response.headers.set('Access-Control-Max-Age', '86400')
    return response
  }

  // Initial response with CORS headers
  const initialResponse = NextResponse.next()
  if (allowed && origin) {
    initialResponse.headers.set('Access-Control-Allow-Origin', getAllowOriginValue(origin))
  }
  initialResponse.headers.set('Access-Control-Allow-Credentials', 'true')

  // Combine with auth session update
  return await updateSession(request, initialResponse)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
