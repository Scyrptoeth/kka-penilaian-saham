import 'server-only'

export const ACCESS_COOKIE_NAME = 'kka_access'

export interface AccessCookieOptions {
  readonly maxAgeSeconds: number
}

export function buildAccessCookie(token: string, options: AccessCookieOptions) {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    name: ACCESS_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: options.maxAgeSeconds,
  }
}

export function buildClearedAccessCookie() {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    name: ACCESS_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }
}
