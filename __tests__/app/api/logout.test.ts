// @vitest-environment node
import { describe, expect, it } from 'vitest'

describe('POST /api/akses/logout', () => {
  it('clears the access cookie', async () => {
    const { POST } = await import('@/app/api/akses/logout/route')
    const res = await POST()
    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('kka_access=')
    expect(setCookie.toLowerCase()).toContain('max-age=0')
  })
})
