import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import type { EmprestimoPendente } from '@/hooks/useDashboard'
import { formatarPatrimonio } from '@/hooks/useFerramentas'
import { cn } from '@/lib/utils'

/** Linha de empréstimo pendente: quem está com a ferramenta, qual é, o prazo e o atalho para devolver. */
export function EmprestimoPendenteItem({
  item,
  prazo,
  tomPrazo,
}: {
  item: EmprestimoPendente
  /** Texto à direita (ex.: "7d", "Hoje", "Em 2d"). */
  prazo: string
  tomPrazo: string
}) {
  const codigo = formatarPatrimonio(item.codigo_identificacao)
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-corpo font-medium">{item.ferramenta_nome}</p>
        <p className="truncate text-rotulo text-muted-foreground">
          {codigo} · {item.colaborador_nome} ({item.colaborador_matricula}) · {item.setor_nome}
        </p>
      </div>
      <span className={cn('shrink-0 text-corpo font-semibold', tomPrazo)}>{prazo}</span>
      <Button asChild size="sm" variant="outline">
        <Link to={`/devolucoes?codigo=${codigo}`}>Devolver</Link>
      </Button>
    </div>
  )
}
