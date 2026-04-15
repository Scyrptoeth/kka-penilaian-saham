// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'

import whitelist from '../../../data/nip-whitelist.json'

const VALID_NIP = whitelist.nips[0] as string

async function loadRoute() {
  process.env.JWT_SECRET = 'test-secret-abcdefghijklmnopqrstuvwxyz012345'
  const { _resetAll } = await import('@/lib/auth/rate-limit')
  _resetAll()
  return await import('@/app/api/akses/route')
}

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/akses', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '127.0.0.1', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/akses', () => {
  beforeEach(() => {
    delete process.env.NODE_ENV
  })

  it('accepts a whitelisted NIP and sets a HttpOnly cookie', async () => {
    const { POST } = await loadRoute()
    const res = await POST(makeRequest({ nip: VALID_NIP }) as never)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('kka_access=')
    expect(setCookie.toLowerCase()).toContain('httponly')
    expect(setCookie.toLowerCase()).toContain('samesite=lax')
    expect(setCookie.toLowerCase()).toContain('max-age=2592000')
  })

  it('rejects a non-whitelisted NIP with 401 and no cookie', async () => {
    const { POST } = await loadRoute()
    const res = await POST(makeRequest({ nip: '000000000' }, { 'x-forwarded-for': '10.0.0.2' }) as never)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.error).toMatch(/tidak terdaftar/i)
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('rejects missing nip with 400', async () => {
    const { POST } = await loadRoute()
    const res = await POST(makeRequest({}, { 'x-forwarded-for': '10.0.0.3' }) as never)
    expect(res.status).toBe(400)
  })

  it('rejects malformed JSON with 400', async () => {
    const { POST } = await loadRoute()
    const res = await POST(makeRequest('{{not json', { 'x-forwarded-for': '10.0.0.4' }) as never)
    expect(res.status).toBe(400)
  })

  it('rate-limits after 10 attempts in the window', async () => {
    const { POST } = await loadRoute()
    const ip = '10.0.0.5'
    for (let i = 0; i < 10; i++) {
      const r = await POST(makeRequest({ nip: '000000000' }, { 'x-forwarded-for': ip }) as never)
      expect(r.status).toBe(401)
    }
    const blocked = await POST(makeRequest({ nip: VALID_NIP }, { 'x-forwarded-for': ip }) as never)
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('retry-after')).toBeTruthy()
  })
})
