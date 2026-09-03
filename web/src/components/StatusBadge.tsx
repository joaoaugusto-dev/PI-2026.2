import { cn } from '@/lib/utils'

export type Status = 'disponivel' | 'em-uso' | 'indisponivel' | 'atraso'

/**
 * Regra do design system (FE-01): status nunca e comunicado so por cor.
 * Cada estado tem forma propria (circulo cheio / circulo vazado / quadrado /
 * triangulo) alem do rotulo em texto.
 */
const estados = {
  disponivel: {
    label: 'Disponível',
    className: 'border-status-disponivel/25 bg-status-disponivel/10 text-status-disponivel',
    marca: 'size-2 rounded-full bg-current',
  },
  'em-uso': {
    label: 'Em uso',
    className: 'border-status-em-uso/40 bg-transparent text-status-em-uso',
    marca: 'size-2 rounded-full border-2 border-current',
  },
  indisponivel: {
    label: 'Indisponível',
    className:
      'border-status-indisponivel/25 bg-status-indisponivel/10 text-status-indisponivel',
    marca: 'size-2 rounded-[1px] bg-current',
  },
  atraso: {
    label: 'Atrasado',
    className: 'border-status-atraso/30 bg-status-atraso/10 text-status-atraso',
    marca: 'size-0 border-x-4 border-x-transparent border-b-[7px] border-b-current',
  },
} as const

type StatusBadgeProps = {
  status: Status
  /** Obrigatorio em `atraso`: o badge sempre mostra o numero de dias. */
  dias?: number
  className?: string
}

export function StatusBadge({ status, dias, className }: StatusBadgeProps) {
  const estado = estados[status]
  const texto =
    status === 'atraso' && dias !== undefined
      ? `${estado.label} ${dias} ${dias === 1 ? 'dia' : 'dias'}`
      : estado.label

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-md border px-2 py-1 text-sm font-medium whitespace-nowrap',
        estado.className,
        className,
      )}
    >
      <span aria-hidden className={estado.marca} />
      {texto}
    </span>
  )
}
