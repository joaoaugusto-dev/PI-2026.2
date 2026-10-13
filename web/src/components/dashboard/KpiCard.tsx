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
  dica?: string
}

export function KpiCard({ label, valor, tom, to, dica }: KpiCardProps) {
  return (
    <Link to={to} className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <Card className="gap-0 px-4 py-3 transition-colors hover:bg-muted/50">
        <span className="text-rotulo font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
        {/* zero não é alarme: cor de status só quando há o que olhar */}
        <span className={cn('text-kpi tabular-nums', tom && valor > 0 ? TOM_CLASSE[tom] : valor > 0 ? 'text-foreground' : 'text-muted-foreground')}>
          {valor}
        </span>
        {dica && <span className="mt-1 text-xs text-muted-foreground">{dica}</span>}
      </Card>
    </Link>
  )
}
