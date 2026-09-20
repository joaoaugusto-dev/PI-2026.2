import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function BotaoSecundario({ className, type = 'button', ...props }: ComponentProps<'button'>) {
  return (
    <button
      type={type}
      className={cn(
        'h-9 shrink-0 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted',
        className,
      )}
      {...props}
    />
  )
}
