// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const TEST_SECRET = 'test-secret-abcdefghijklmnopqrstuvwxyz012345'

describe('jwt access token', () => {
  let signAccessToken: typeof import('@/lib/auth/jwt').signAccessToken
  let verifyAccessToken: typeof import('@/lib/auth/jwt').verifyAccessToken

  beforeEach(async () => {
    process.env.JWT_SECRET = TEST_SECRET
    const mod = await import('@/lib/auth/jwt')
    signAccessToken = mod.signAccessToken
    verifyAccessToken = mod.verifyAccessToken
  })

  afterEach(() => {
    delete process.env.JWT_SECRET
  })

  it('round-trips NIP in the sub claim', async () => {
    const token = await signAccessToken('60096391')
    const payload = await verifyAccessToken(token)
    expect(payload).not.toBeNull()
    expect(payload!.sub).toBe('60096391')
    expect(payload!.exp).toBeGreaterThan(payload!.iat)
  })

  it('rejects a tampered token', async () => {
    const token = await signAccessToken('60096391')
    const parts = token.split('.')
    const tampered = `${parts[0]}.${parts[1]}X.${parts[2]}`
    const payload = await verifyAccessToken(tampered)
    expect(payload).toBeNull()
  })

  it('rejects an empty token', async () => {
    const payload = await verifyAccessToken('')
    expect(payload).toBeNull()
  })

  it('rejects a token garbled beyond recovery', async () => {
    const payload = await verifyAccessToken('not-a-jwt')
    expect(payload).toBeNull()
  })

  it('encodes a 30-day expiration window', async () => {
    const token = await signAccessToken('60096391')
    const payload = await verifyAccessToken(token)
    const thirtyDaysSec = 60 * 60 * 24 * 30
    expect(payload!.exp - payload!.iat).toBe(thirtyDaysSec)
  })
})
