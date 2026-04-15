import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { isNipValid } from '@/lib/auth/nip-whitelist'
import { ACCESS_COOKIE_MAX_AGE_SECONDS, signAccessToken } from '@/lib/auth/jwt'
import { buildAccessCookie } from '@/lib/auth/cookie'
import { checkAndRecord } from '@/lib/auth/rate-limit'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  const rl = checkAndRecord(`akses:${ip}`)
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Terlalu banyak percobaan. Coba lagi sebentar.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryInSeconds) } },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Permintaan tidak valid.' }, { status: 400 })
  }

  const nipRaw = (body as { nip?: unknown })?.nip
  const nip = typeof nipRaw === 'string' ? nipRaw.trim() : ''

  if (!nip) {
    return NextResponse.json({ ok: false, error: 'NIP Pendek wajib diisi.' }, { status: 400 })
  }

  if (!isNipValid(nip)) {
    return NextResponse.json(
      { ok: false, error: 'NIP Pendek tidak terdaftar sebagai penilai yang berhak.' },
      { status: 401 },
    )
  }

  const token = await signAccessToken(nip)
  const cookie = buildAccessCookie(token, { maxAgeSeconds: ACCESS_COOKIE_MAX_AGE_SECONDS })

  const response = NextResponse.json({ ok: true }, { status: 200 })
  response.cookies.set(cookie)
  return response
}
