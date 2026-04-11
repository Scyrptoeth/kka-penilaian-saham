import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'h-10 w-full rounded-sm border border-grid-strong bg-canvas-raised px-3 text-sm text-ink',
        'focus:border-ink focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'aria-[invalid=true]:border-negative',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
})
