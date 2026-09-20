import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

export type TomKpi = 'disponivel' | 'indisponivel' | 'atraso'

const TOM_CLASSE: Record<TomKpi, string> = {
  disponivel: 'text-status-disponivel',
  indisponivel: 'text-status-indisponivel',
  atraso: 'text-status-atraso',
}

type KpiCardProps = {
  label: string
  valor: number
  tom?: TomKpi
}

export function KpiCard({ label, valor, tom }: KpiCardProps) {
  return (
    <Card className="gap-1 p-4">
      <span className="text-rotulo font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className={cn('text-kpi tabular-nums', tom ? TOM_CLASSE[tom] : 'text-foreground')}>{valor}</span>
    </Card>
  )
}
