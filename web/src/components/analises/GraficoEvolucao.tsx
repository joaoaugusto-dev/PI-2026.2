import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { METRICAS } from '@/components/analises/rotulos'
import type { Evolucao } from '@/hooks/useKpis'
import { inteiroBR, rotuloBalde } from '@/lib/numeros'

const EIXO = { fontSize: 12, fill: 'var(--muted-foreground)' }
const ALTURA_EIXO_X = 24

function Dica({ active, payload, label, granularidade }: TooltipContentProps<ValueType, NameType> & { granularidade: Evolucao['granularidade'] }) {
  if (!active || !payload?.length) return null
  const prefixo = granularidade === 'semana' ? 'Semana de ' : ''
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-sm shadow-md ring-1 ring-foreground/10">
      <p className="text-muted-foreground">
        {prefixo}
        {rotuloBalde(String(label), granularidade)}
      </p>
      <p className="font-semibold tabular-nums">
        {payload[0].name}: {inteiroBR(Number(payload[0].value))}
      </p>
    </div>
  )
}

/**
 * Evolução em faixas (small multiples): uma faixa por métrica, todas na mesma escala e no mesmo eixo de
 * tempo, em vez de três linhas coloridas num gráfico só — a paleta da marca (preto, cinza, vermelho) não
 * distingue três séries com segurança, e cada faixa já diz o nome dela. O cursor anda nas três juntas
 * (`syncId`). `largura` fixa é a versão de impressão: sem animação (a impressão fotografaria a linha no
 * meio do caminho) e sem medir o contêiner, que fica escondido na tela.
 */
export function GraficoEvolucao({ dado, altura, largura }: { dado: Evolucao; altura: number; largura?: number }) {
  const impressao = largura !== undefined
  const teto = Math.max(1, ...dado.serie.flatMap((b) => METRICAS.map((m) => b[m.chave])))
  const alturaFaixa = Math.max(48, Math.floor((altura - ALTURA_EIXO_X) / METRICAS.length))

  return (
    <div className="flex flex-col">
      {METRICAS.map((m, i) => {
        const ultima = i === METRICAS.length - 1
        const h = alturaFaixa + (ultima ? ALTURA_EIXO_X : 0)
        const grafico = (
          <AreaChart
            data={dado.serie}
            syncId={impressao ? undefined : 'evolucao'}
            margin={{ top: 6, right: 8, bottom: 0, left: 0 }}
            width={impressao ? largura - 112 : undefined}
            height={impressao ? h : undefined}
          >
            <XAxis
              dataKey="inicio"
              hide={!ultima}
              tickFormatter={(v: string) => rotuloBalde(v, dado.granularidade)}
              tick={EIXO}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              minTickGap={16}
              height={ALTURA_EIXO_X}
            />
            <YAxis domain={[0, teto]} ticks={[0, teto]} allowDecimals={false} tick={EIXO} tickLine={false} axisLine={false} width={28} />
            {!impressao && (
              <Tooltip
                content={(p) => <Dica {...p} granularidade={dado.granularidade} />}
                cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
              />
            )}
            <Area
              dataKey={m.chave}
              name={m.rotulo}
              type="linear"
              stroke={m.cor}
              strokeWidth={2}
              fill={m.cor}
              fillOpacity={0.1}
              activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2 }}
              isAnimationActive={!impressao}
            />
          </AreaChart>
        )
        return (
          <div key={m.chave} className="flex items-start gap-2" style={{ height: h }}>
            <div className="w-26 shrink-0 pt-1">
              <p className="text-sm text-muted-foreground">{m.rotulo}</p>
              <p className="text-secao tabular-nums">{inteiroBR(dado.totais.atual[m.chave])}</p>
            </div>
            <div className="min-w-0 flex-1" style={{ height: h }}>
              {impressao ? grafico : <ResponsiveContainer>{grafico}</ResponsiveContainer>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
