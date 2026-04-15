import 'server-only'

import { SignJWT, jwtVerify } from 'jose'

const ALG = 'HS256'
const ISSUER = 'kka-penilaian-saham'
const AUDIENCE = 'kka-access'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

let cachedKey: Uint8Array | null = null

function getSecretKey(): Uint8Array {
  if (cachedKey) return cachedKey
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET missing or too short (min 32 chars)')
  }
  cachedKey = new TextEncoder().encode(secret)
  return cachedKey
}

export interface AccessTokenPayload {
  readonly sub: string
  readonly iat: number
  readonly exp: number
}

export async function signAccessToken(nip: string): Promise<string> {
  const key = getSecretKey()
  return await new SignJWT({})
    .setProtectedHeader({ alg: ALG })
    .setSubject(nip)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key)
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  if (!token) return null
  try {
    const key = getSecretKey()
    const { payload } = await jwtVerify(token, key, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: [ALG],
    })
    if (typeof payload.sub !== 'string' || typeof payload.iat !== 'number' || typeof payload.exp !== 'number') {
      return null
    }
    return { sub: payload.sub, iat: payload.iat, exp: payload.exp }
  } catch {
    return null
  }
}

export const ACCESS_COOKIE_MAX_AGE_SECONDS = MAX_AGE_SECONDS
