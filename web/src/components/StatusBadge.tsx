import { cn } from '@/lib/utils'

export type Status = 'disponivel' | 'em-uso' | 'indisponivel' | 'atraso'

/**
 * Regra do design system (FE-01): status nunca e comunicado so por cor.
 * Cada estado tem forma propria (circulo cheio / circulo vazado / quadrado /
 * triangulo) alem do rotulo em texto.
 */
/*
 * Todo marcador ocupa a mesma caixa `size-2`, centrada — inclusive o
 * triangulo, desenhado com `clip-path` em vez de borda. Se a caixa nao for
 * simetrica em todos os estados, o halo de `.status-vivo` (que se ancora no
 * `inset` desse elemento) sai descentralizado so no estado que for diferente.
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
    marca: 'size-2 bg-current [clip-path:polygon(50%_6%,95%_94%,5%_94%)]',
  },
} as const

type StatusBadgeProps = {
  status: Status
  /** Obrigatorio em `atraso`: o badge sempre mostra o numero de dias. */
  dias?: number
  /**
   * Liga a respiracao continua do marcador, para estado em andamento.
   * So em elemento singular — cabecalho de detalhe, KPI, chip de filtro.
   * Nunca dentro de linha de tabela: 400 linhas respirando sao 400 camadas
   * compostas por quadro.
   */
  vivo?: boolean
  className?: string
}

export function StatusBadge({ status, dias, vivo, className }: StatusBadgeProps) {
  const estado = estados[status]
  const texto =
    status === 'atraso' && dias !== undefined
      ? `${estado.label} ${dias} ${dias === 1 ? 'dia' : 'dias'}`
      : estado.label

  return (
    <span
      className={cn(
        'transicao-status inline-flex w-fit items-center gap-1.5 rounded-md border px-2 py-1 text-sm font-medium whitespace-nowrap',
        estado.className,
        className,
      )}
    >
      <span aria-hidden className={cn(estado.marca, vivo && 'status-vivo')} />
      {texto}
    </span>
  )
}
