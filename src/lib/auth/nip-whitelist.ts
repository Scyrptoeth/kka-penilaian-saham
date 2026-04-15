import 'server-only'

import whitelistJson from '@/../data/nip-whitelist.json'

interface WhitelistFile {
  readonly count: number
  readonly nips: readonly string[]
}

const WHITELIST = whitelistJson as WhitelistFile
const NIP_SET: ReadonlySet<string> = new Set(WHITELIST.nips)

export function isNipValid(nip: unknown): boolean {
  if (typeof nip !== 'string') return false
  const trimmed = nip.trim()
  if (!/^\d{6,12}$/.test(trimmed)) return false
  return NIP_SET.has(trimmed)
}

export function whitelistSize(): number {
  return NIP_SET.size
}
