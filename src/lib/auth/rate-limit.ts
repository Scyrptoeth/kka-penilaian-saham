import 'server-only'

interface Bucket {
  count: number
  resetAt: number
}

const WINDOW_MS = 5 * 60 * 1000
const MAX_ATTEMPTS = 10
const MAX_BUCKETS = 10_000

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  readonly allowed: boolean
  readonly retryInSeconds: number
}

export function checkAndRecord(key: string): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    pruneIfBloated()
    return { allowed: true, retryInSeconds: 0 }
  }
  if (bucket.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryInSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  bucket.count += 1
  return { allowed: true, retryInSeconds: 0 }
}

export function resetKey(key: string): void {
  buckets.delete(key)
}

export function _resetAll(): void {
  buckets.clear()
}

function pruneIfBloated() {
  if (buckets.size <= MAX_BUCKETS) return
  const now = Date.now()
  for (const [k, v] of buckets) {
    if (v.resetAt < now) buckets.delete(k)
  }
}
