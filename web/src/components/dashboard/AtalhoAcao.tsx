import type { ElementType } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

type AtalhoAcaoProps = {
  to: string
  titulo: string
  descricao: string
  icone: ElementType<{ className?: string }>
  /** `primario` = vermelho de marca; `escuro` = preto do texto. */
  variante: 'primario' | 'escuro'
}

const VARIANTES = {
  primario: {
    card: 'border-transparent bg-primary text-primary-foreground hover:bg-brand-red-dark',
    descricao: 'text-primary-foreground/80',
  },
  escuro: {
    card: 'bg-foreground text-background hover:bg-foreground/90',
    descricao: 'text-background/80',
  },
}

export function AtalhoAcao({ to, titulo, descricao, icone: Icone, variante }: AtalhoAcaoProps) {
  const estilo = VARIANTES[variante]
  return (
    <Link to={to}>
      <Card className={cn('h-full flex-row items-center justify-between gap-3 p-6 transition-colors', estilo.card)}>
        <div>
          <p className="text-titulo font-semibold">{titulo}</p>
          <p className={cn('text-corpo', estilo.descricao)}>{descricao}</p>
        </div>
        <Icone className="size-6 shrink-0" />
      </Card>
    </Link>
  )
}
