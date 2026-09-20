import type { ComponentProps, ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type CampoIdentificacaoProps = ComponentProps<'input'> & {
  icone: ElementType<{ className?: string }>
  /** Classes do contêiner (bordas de estado: reconhecido, erro, vazio). */
  estadoClassName?: string
  /** Fonte mono só no campo do código de patrimônio. */
  mono?: boolean
  /** Ícones/rótulos à direita (ex.: check, erro, dica "Enter"). */
  children?: ReactNode
}

/** Campo de leitura (scanner físico ou digitação) com foco de marca. */
export function CampoIdentificacao({
  icone: Icone,
  estadoClassName,
  mono,
  children,
  className,
  ...inputProps
}: CampoIdentificacaoProps) {
  return (
    <div
      className={cn(
        'flex h-(--control-h) items-center gap-2 rounded-lg border bg-background px-3 focus-within:border-brand-red focus-within:ring-2 focus-within:ring-brand-red/20',
        estadoClassName,
      )}
    >
      <Icone className="size-5 shrink-0 text-muted-foreground" />
      <input
        className={cn(
          'h-full flex-1 bg-transparent text-corpo outline-none',
          mono && 'font-mono placeholder:font-sans',
          className,
        )}
        {...inputProps}
      />
      {children}
    </div>
  )
}

export function DicaEnter() {
  return <span className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">Enter</span>
}
