import type { UpstreamSlice } from './types'
import type { ExportableState } from '@/lib/export/export-xlsx'

/**
 * Return true iff every required slice in `upstream` is populated in
 * `state`. Empty upstream array → true (no dependencies).
 *
 * Sentinel rules:
 *   - Most slices: non-null means populated (editor has been opened)
 *   - aamAdjustments: Record<number, number> — populated iff at least one
 *     key exists (user has explicitly saved an adjustment)
 */
export function isPopulated(
  upstream: readonly UpstreamSlice[],
  state: ExportableState,
): boolean {
  return upstream.every((key) => {
    if (key === 'aamAdjustments') {
      return Object.keys(state.aamAdjustments).length > 0
    }
    if (key === 'interestBearingDebt') {
      return state.interestBearingDebt !== null
    }
    return state[key] !== null
  })
}
