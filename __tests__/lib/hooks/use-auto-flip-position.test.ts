import { afterEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAutoFlipPosition } from '@/lib/hooks/useAutoFlipPosition'

const ORIGINAL_INNER_HEIGHT = window.innerHeight

function setViewportHeight(px: number) {
  Object.defineProperty(window, 'innerHeight', { value: px, configurable: true })
}

function makeTrigger({ top, bottom }: { top: number; bottom: number }): HTMLElement {
  const el = document.createElement('button')
  document.body.appendChild(el)
  el.getBoundingClientRect = () =>
    ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect
  return el
}

describe('useAutoFlipPosition', () => {
  afterEach(() => {
    setViewportHeight(ORIGINAL_INNER_HEIGHT)
    document.body.innerHTML = ''
  })

  it('returns placement=bottom when trigger has ample space below', () => {
    setViewportHeight(800)
    const trigger = makeTrigger({ top: 100, bottom: 130 })

    const { result } = renderHook(() => useAutoFlipPosition({ current: trigger }, { contentHeight: 240 }))

    expect(result.current.placement).toBe('bottom')
  })

  it('flips to placement=top when trigger is near viewport bottom and space above is larger', () => {
    setViewportHeight(800)
    // Trigger at y=720-750 → only 50px below, 720px above
    const trigger = makeTrigger({ top: 720, bottom: 750 })

    const { result } = renderHook(() => useAutoFlipPosition({ current: trigger }, { contentHeight: 240 }))

    expect(result.current.placement).toBe('top')
  })

  it('stays at placement=bottom when space below is limited but still exceeds space above', () => {
    setViewportHeight(800)
    // Trigger at y=60-90 → only 60px above (not enough to flip), 710px below → plenty
    const trigger = makeTrigger({ top: 60, bottom: 90 })

    const { result } = renderHook(() => useAutoFlipPosition({ current: trigger }, { contentHeight: 240 }))

    expect(result.current.placement).toBe('bottom')
  })

  it('returns placement=bottom and ignores ref when current is null (SSR/no-op)', () => {
    setViewportHeight(800)

    const { result } = renderHook(() => useAutoFlipPosition({ current: null }, { contentHeight: 240 }))

    expect(result.current.placement).toBe('bottom')
  })
})
