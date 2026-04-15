import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { verifyAccessToken } from '@/lib/auth/jwt'
import { ACCESS_COOKIE_NAME } from '@/lib/auth/cookie'

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value
  const payload = token ? await verifyAccessToken(token) : null

  if (payload) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = '/akses'
  url.searchParams.set('from', request.nextUrl.pathname)
  return NextResponse.redirect(url)
}

export const config = {
  // Gate every path EXCEPT:
  //  - /akses page (entry form)
  //  - /api/akses* (verify + logout endpoints)
  //  - Next.js internals (_next, static, favicon, manifest, etc.)
  matcher: ['/((?!akses|api/akses|_next|favicon|robots\\.txt|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|ico|webp|woff|woff2)).*)'],
}
