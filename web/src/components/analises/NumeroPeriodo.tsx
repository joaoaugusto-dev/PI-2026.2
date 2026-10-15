import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { METRICAS } from '@/components/analises/rotulos'
import type { Evolucao, Metrica } from '@/hooks/useKpis'
import { dataBR } from '@/lib/formatar'
import { inteiroBR, percentualBR } from '@/lib/numeros'
import { cn } from '@/lib/utils'

/** "▲ 12,5%": a forma da seta e o texto dizem a direção; a cor só reforça, e só onde subir é ruim. */
function Variacao({ valor, subirEhRuim }: { valor: number; subirEhRuim?: boolean }) {
  const Icone = valor > 0 ? TrendingUp : valor < 0 ? TrendingDown : Minus
  const tom = !subirEhRuim || valor === 0 ? 'text-muted-foreground' : valor > 0 ? 'text-status-indisponivel' : 'text-status-disponivel'
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm font-medium', tom)}>
      <Icone className="size-4" aria-hidden />
      {valor > 0 ? '+' : ''}
      {percentualBR(valor)}
    </span>
  )
}

/** Total do período, variação sobre o período anterior e, se couber, a curva do período (sparkline). */
export function NumeroPeriodo({ dado, metrica, altura }: { dado: Evolucao; metrica: Metrica; altura: number }) {
  const cor = METRICAS.find((m) => m.chave === metrica)!.cor
  const anterior = dado.periodo_anterior
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* número grande com algarismos proporcionais (tabular-nums deixa "121" frouxo nesse tamanho) */}
      <span className="text-kpi">{inteiroBR(dado.totais.atual[metrica])}</span>
      <span className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
        {dado.variacao_percentual[metrica] === null ? (
          `Nada de ${dataBR(anterior.de).slice(0, 5)} a ${dataBR(anterior.ate).slice(0, 5)} para comparar`
        ) : (
          <>
            <Variacao valor={dado.variacao_percentual[metrica]} subirEhRuim={metrica === 'ocorrencias'} />
            <span>
              vs {inteiroBR(dado.totais.anterior[metrica])} de {dataBR(anterior.de).slice(0, 5)} a {dataBR(anterior.ate).slice(0, 5)}
            </span>
          </>
        )}
      </span>
      {altura >= 120 && dado.serie.length > 1 && (
        <div className="mt-auto min-h-0 flex-1 pt-3" aria-hidden>
          <ResponsiveContainer>
            <AreaChart data={dado.serie} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <Area dataKey={metrica} type="linear" stroke={cor} strokeWidth={2} fill={cor} fillOpacity={0.1} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
