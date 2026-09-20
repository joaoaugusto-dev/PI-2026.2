import type { ElementType, ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'

type Tom = 'disponivel' | 'atraso' | 'indisponivel'

// Classes completas (não montadas por interpolação) para o Tailwind enxergá-las.
const TONS: Record<Tom, { card: string; icone: string; titulo: string; badge: string }> = {
  disponivel: {
    card: 'border-status-disponivel/30 bg-status-disponivel/5',
    icone: 'bg-status-disponivel/15 text-status-disponivel',
    titulo: 'text-status-disponivel',
    badge: 'bg-status-disponivel/10 text-status-disponivel border-status-disponivel/40',
  },
  atraso: {
    card: 'border-status-atraso/40 bg-status-atraso/5',
    icone: 'bg-status-atraso/15 text-status-atraso',
    titulo: 'text-status-atraso',
    badge: 'bg-status-atraso/10 text-status-atraso border-status-atraso/40',
  },
  indisponivel: {
    card: 'border-status-indisponivel/40 bg-status-indisponivel/5',
    icone: 'bg-status-indisponivel/15 text-status-indisponivel',
    titulo: 'text-status-indisponivel',
    badge: 'bg-status-indisponivel/10 text-status-indisponivel border-status-indisponivel/40',
  },
}

type BannerStatusProps = {
  tom: Tom
  icone: ElementType<{ className?: string }>
  titulo: string
  selo: string
  children: ReactNode
}

/** Faixa principal da página de status: estado geral dos serviços (ok, degradado ou offline). */
export function BannerStatus({ tom, icone: Icone, titulo, selo, children }: BannerStatusProps) {
  const estilo = TONS[tom]
  return (
    <Card className={estilo.card}>
      <CardContent className="p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2.5 ${estilo.icone}`}>
              <Icone className="size-7" />
            </div>
            <div>
              <h2 className={`text-secao ${estilo.titulo}`}>{titulo}</h2>
              <p className="text-corpo text-muted-foreground">{children}</p>
            </div>
          </div>
          <Badge variant="outline" className={`px-3 py-1 text-rotulo ${estilo.badge}`}>
            {selo}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
