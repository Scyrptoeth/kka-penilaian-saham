import { NextResponse } from 'next/server'

import { buildClearedAccessCookie } from '@/lib/auth/cookie'

export const runtime = 'nodejs'

export async function POST() {
  const response = NextResponse.json({ ok: true }, { status: 200 })
  response.cookies.set(buildClearedAccessCookie())
  return response
}
