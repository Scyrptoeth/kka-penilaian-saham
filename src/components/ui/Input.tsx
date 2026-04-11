import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  mono?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, mono, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'h-10 w-full rounded-sm border border-grid-strong bg-canvas-raised px-3 text-sm text-ink',
        'placeholder:text-ink-muted',
        'focus:border-ink focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'aria-[invalid=true]:border-negative',
        mono && 'font-mono tabular-nums',
        className
      )}
      {...props}
    />
  )
})
