import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-sm px-5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' &&
          'bg-ink text-canvas-raised hover:bg-ink-soft',
        variant === 'ghost' &&
          'border border-grid-strong bg-canvas-raised text-ink hover:border-ink',
        className
      )}
      {...props}
    />
  )
})
