import { Eye } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

/**
 * Input de senha com olho animado: o traço na diagonal cresce (`scaleX`,
 * 0 → 1) quando a senha fica visível, em vez de trocar de ícone — só
 * transform, mesma regra de movimento do resto do design system.
 */
export function CampoSenha({ className, ...props }: ComponentProps<'input'>) {
  const [mostrar, setMostrar] = useState(false)

  return (
    <div className="relative">
      <Input type={mostrar ? 'text' : 'password'} className={cn('h-(--control-h) pr-14', className)} {...props} />
      <button
        type="button"
        onClick={() => setMostrar((v) => !v)}
        aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
        className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <span className="relative inline-flex">
          <Eye className="size-6" />
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute left-1/2 top-1/2 h-0.5 w-7 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-current transition-transform',
              mostrar ? 'scale-x-100' : 'scale-x-0',
            )}
          />
        </span>
      </button>
    </div>
  )
}
