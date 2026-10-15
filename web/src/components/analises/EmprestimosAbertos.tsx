import { TriangleAlert } from 'lucide-react'
import { formatarPatrimonio } from '@/hooks/useFerramentas'
import type { EmprestimosAbertos as Dado } from '@/hooks/useKpis'
import { useQuantosCabem } from '@/hooks/useQuantosCabem'
import { inteiroBR } from '@/lib/numeros'
import { cn } from '@/lib/utils'

/** Quantas ferramentas estão fora agora, quantas atrasadas e as que estão fora há mais tempo. */
export function EmprestimosAbertos({ dado }: { dado: Dado }) {
  const { ref, cabem } = useQuantosCabem<HTMLUListElement>(dado.mais_antigos.length)
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
        <div>
          <span className="text-kpi">{inteiroBR(dado.total)}</span>
          <span className="block text-sm text-muted-foreground">em uso agora</span>
        </div>
        <div className={dado.atrasados > 0 ? 'text-status-atraso' : 'text-muted-foreground'}>
          <span className="flex items-center gap-1.5 text-titulo">
            {dado.atrasados > 0 && <TriangleAlert className="size-5" aria-hidden />}
            {inteiroBR(dado.atrasados)}
          </span>
          <span className="block text-sm">{dado.atrasados === 1 ? 'atrasada' : 'atrasadas'}</span>
        </div>
      </div>
      {dado.mais_antigos.length > 0 && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <p className="text-rotulo tracking-wide text-muted-foreground uppercase">Fora há mais tempo</p>
          <ul ref={ref} className="relative mt-1 min-h-0 flex-1 divide-y overflow-hidden">
            {dado.mais_antigos.map((e, i) => (
              <li key={e.emprestimo_id} className={cn('flex items-baseline justify-between gap-3 py-2', i >= cabem && 'invisible')}>
                <span className="min-w-0 text-sm leading-tight">
                  <span className="font-medium">{e.ferramenta_nome}</span>
                  <span className="text-muted-foreground"> · {formatarPatrimonio(e.codigo_identificacao)}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {e.dias_aberto === 0 ? 'hoje' : `${e.dias_aberto} ${e.dias_aberto === 1 ? 'dia' : 'dias'}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
