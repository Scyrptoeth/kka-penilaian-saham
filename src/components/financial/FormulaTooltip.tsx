'use client'

import { useCallback, useId, useState } from 'react'
import { cn } from '@/lib/utils/cn'

interface FormulaTooltipProps {
  description: string
  excel?: string
  children: React.ReactNode
}

/**
 * Lightweight accessible formula tooltip. Shows on hover, focus-visible, or
 * press (keyboard activation). No portal — tooltip is positioned absolutely
 * relative to the trigger. Sufficient for P1 dense tables.
 *
 * Accessibility:
 *   - trigger is a real <button type="button"> with aria-describedby
 *   - tooltip content is mounted when open, unmounted when closed
 *   - respects prefers-reduced-motion via CSS (no JS animation)
 */
export function FormulaTooltip({
  description,
  excel,
  children,
}: FormulaTooltipProps) {
  const [open, setOpen] = useState(false)
  const id = useId()

  const show = useCallback(() => setOpen(true), [])
  const hide = useCallback(() => setOpen(false), [])

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className="inline-flex cursor-help items-baseline rounded-sm font-mono tabular-nums outline-none transition-colors hover:text-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-describedby={open ? id : undefined}
      >
        {children}
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'pointer-events-none absolute right-0 top-full z-30 mt-1 w-max max-w-xs',
            'rounded-sm border border-grid-strong bg-canvas-raised px-2.5 py-2 text-left text-[11px]',
            'shadow-[0_8px_24px_-4px_rgba(10,22,40,0.15)]',
          )}
        >
          <span className="block font-semibold text-ink">{description}</span>
          {excel && (
            <span className="mt-1 block font-mono text-[10px] text-ink-muted">
              <span className="text-accent">Excel:</span> {excel}
            </span>
          )}
        </span>
      )}
    </span>
  )
}
