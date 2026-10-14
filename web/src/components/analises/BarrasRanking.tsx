import { useQuantosCabem } from '@/hooks/useQuantosCabem'
import { cn } from '@/lib/utils'

export interface ItemRanking {
  chave: string | number
  nome: string
  detalhe?: string
  valor: number
  rotulo: string
}

export type TomBarra = 'neutro' | 'problema'

/**
 * Ranking em barras horizontais feito em HTML (não em SVG): o nome quebra linha em vez de ser cortado (a
 * medida da ferramenta é a informação) e o valor fica escrito na ponta, então a barra não precisa de eixo
 * nem de tooltip. Mostra as linhas que cabem inteiras no cartão (medidas); o resto vai para o relatório e a planilha.
 */
export function BarrasRanking({ itens, altura, tom = 'neutro' }: { itens: ItemRanking[]; altura: number; tom?: TomBarra }) {
  const { ref, cabem } = useQuantosCabem<HTMLOListElement>(altura, itens.length)
  const maior = Math.max(...itens.map((i) => i.valor), 1)
  const restantes = itens.length - cabem

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ol ref={ref} className="lista-stagger relative flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        {itens.map((item, i) => (
          <li key={item.chave} className={cn('animate-entrada', i >= cabem && 'invisible')}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-sm leading-tight">
                <span className="mr-1.5 text-muted-foreground tabular-nums">{i + 1}.</span>
                <span className="font-medium">{item.nome}</span>
                {item.detalhe && <span className="text-muted-foreground"> · {item.detalhe}</span>}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{item.rotulo}</span>
            </div>
            {/* trilho no tom de fundo e barra com ponta arredondada só no fim (cresce a partir da base) */}
            <div className="mt-1.5 h-1.5 rounded-r-[4px] bg-muted">
              <div
                className={cn('h-full origin-left rounded-r-[4px]', tom === 'problema' ? 'bg-status-indisponivel' : 'bg-foreground/85')}
                // zero não ganha barra; o resto tem um mínimo para não sumir ao lado do maior
                style={{ width: item.valor > 0 ? `${Math.max((item.valor / maior) * 100, 1.5)}%` : 0 }}
              />
            </div>
          </li>
        ))}
      </ol>
      {/* linha sempre reservada: aparecer o rodapé não pode encolher a lista que acabou de ser medida */}
      <p className="h-7 shrink-0 pt-2 text-sm text-muted-foreground">{restantes > 0 && `+${restantes} no relatório e na planilha`}</p>
    </div>
  )
}
