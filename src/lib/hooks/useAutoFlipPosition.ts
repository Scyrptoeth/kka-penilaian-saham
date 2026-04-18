import { useCallback, useSyncExternalStore, type RefObject } from 'react'

export interface AutoFlipOptions {
  contentHeight?: number
  buffer?: number
}

export interface AutoFlipResult {
  placement: 'top' | 'bottom'
}

/**
 * Decides whether a floating element should open above or below its trigger,
 * based on viewport space. Flips to 'top' when space below is less than the
 * natural content height AND the space above is larger than below.
 *
 * Implemented with `useSyncExternalStore` so it stays compliant with React
 * Compiler's `react-hooks/set-state-in-effect` rule (LESSON-016). A one-shot
 * rAF inside `subscribe` forces a re-snapshot after the trigger element is
 * mounted, so the initial placement reflects real DOM geometry — not the
 * placeholder default.
 */
export function useAutoFlipPosition<T extends HTMLElement>(
  triggerRef: RefObject<T | null>,
  opts: AutoFlipOptions = {},
): AutoFlipResult {
  const contentHeight = opts.contentHeight ?? 240
  const buffer = opts.buffer ?? 12

  const subscribe = useCallback((onChange: () => void) => {
    let rafId = 0
    if (typeof window === 'undefined') return () => {}
    rafId = window.requestAnimationFrame(onChange)
    window.addEventListener('resize', onChange)
    window.addEventListener('scroll', onChange, true)
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onChange)
      window.removeEventListener('scroll', onChange, true)
    }
  }, [])

  const getSnapshot = useCallback((): 'top' | 'bottom' => {
    const el = triggerRef.current
    if (!el || typeof window === 'undefined') return 'bottom'
    const rect = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - buffer
    const spaceAbove = rect.top - buffer
    return spaceBelow < contentHeight && spaceAbove > spaceBelow ? 'top' : 'bottom'
  }, [triggerRef, contentHeight, buffer])

  const getServerSnapshot = useCallback((): 'top' | 'bottom' => 'bottom', [])

  const placement = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return { placement }
}
