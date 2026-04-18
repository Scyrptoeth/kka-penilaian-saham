import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

/**
 * Session 044 Task 2 — active icon must sit INSIDE the thumb (not behind
 * it on the track) so it stays visible in both light and dark mode.
 * Fixes the Session 043 regression where the thumb covered the track icon.
 */

const useThemeMock = vi.fn()
vi.mock('next-themes', () => ({
  useTheme: () => useThemeMock(),
}))

describe('ThemeToggle — icon on thumb (Session 044)', () => {
  it('renders sun icon inside the sliding thumb in light mode', () => {
    useThemeMock.mockReturnValue({ resolvedTheme: 'light', setTheme: vi.fn() })
    const { container } = render(<ThemeToggle />)
    const thumb = container.querySelector('span.bg-ink')
    expect(thumb).toBeTruthy()
    const svg = thumb?.querySelector('svg')
    expect(svg).toBeTruthy()
    // Sun has a <circle> center; Moon has only <path>
    expect(svg?.querySelector('circle')).not.toBeNull()
  })

  it('renders moon icon inside the sliding thumb in dark mode', () => {
    useThemeMock.mockReturnValue({ resolvedTheme: 'dark', setTheme: vi.fn() })
    const { container } = render(<ThemeToggle />)
    const thumb = container.querySelector('span.bg-ink')
    expect(thumb).toBeTruthy()
    const svg = thumb?.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.querySelector('circle')).toBeNull()
    expect(svg?.querySelectorAll('path').length).toBeGreaterThanOrEqual(1)
  })
})
