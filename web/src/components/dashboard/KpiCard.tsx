import { Link } from 'react-router-dom'
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
  to: string
}

export function KpiCard({ label, valor, tom, to }: KpiCardProps) {
  return (
    <Link to={to} className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2">
      <Card className="gap-0 px-4 py-3 transition-colors hover:bg-muted/50">
        <span className="text-rotulo font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
        <span className={cn('text-kpi tabular-nums', tom ? TOM_CLASSE[tom] : 'text-foreground')}>{valor}</span>
      </Card>
    </Link>
  )
}
