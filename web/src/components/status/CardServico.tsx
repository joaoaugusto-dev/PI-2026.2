import type { ElementType, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

type CardServicoProps = {
  titulo: string
  icone: ElementType<{ className?: string }>
  carregando: boolean
  /** Valor principal do card (indicador de status, uptime, latência...). */
  children: ReactNode
  /** Linhas de detalhe (`LinhaDetalhe`) exibidas abaixo do valor. */
  detalhes: ReactNode
}

export function CardServico({ titulo, icone: Icone, carregando, children, detalhes }: CardServicoProps) {
  return (
    <Card className="shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-rotulo font-medium tracking-wide uppercase">{titulo}</CardTitle>
        <Icone className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2">
        {carregando ? <Skeleton className="h-6 w-24" /> : children}
        <div className="flex flex-col gap-1 border-t border-border/50 pt-1 text-rotulo text-muted-foreground">
          {detalhes}
        </div>
      </CardContent>
    </Card>
  )
}

export function LinhaDetalhe({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex justify-between">
      <span>{rotulo}</span>
      {children}
    </div>
  )
}
