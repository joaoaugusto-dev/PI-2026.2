import { BarrasRanking } from '@/components/analises/BarrasRanking'
import { MOTIVO } from '@/components/analises/rotulos'
import type { IndisponiveisAgora } from '@/hooks/useKpis'
import { inteiroBR, percentualBR } from '@/lib/numeros'

/** Parte do parque parada agora: percentual com medidor (trilho do mesmo tom) e o porquê, por motivo. */
export function ParqueIndisponivel({ dado, altura }: { dado: IndisponiveisAgora; altura: number }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <span className="text-kpi">{percentualBR(dado.percentual_do_parque)}</span>
      <span className="text-sm text-muted-foreground">
        {inteiroBR(dado.total_indisponiveis)} de {inteiroBR(dado.total_cadastradas)} ferramentas paradas
      </span>
      <div className="mt-2 h-2 rounded-full bg-status-indisponivel/15" role="meter" aria-valuenow={dado.percentual_do_parque} aria-valuemin={0} aria-valuemax={100} aria-label="Parque indisponível">
        <div className="h-full rounded-full bg-status-indisponivel" style={{ width: `${Math.min(dado.percentual_do_parque, 100)}%` }} />
      </div>
      {dado.por_motivo.length > 0 && (
        <div className="mt-4 min-h-0 flex-1">
          <BarrasRanking
            altura={altura}
            tom="problema"
            itens={dado.por_motivo.map((m) => ({ chave: m.motivo, nome: MOTIVO[m.motivo] ?? m.motivo, valor: m.total, rotulo: inteiroBR(m.total) }))}
          />
        </div>
      )}
    </div>
  )
}
