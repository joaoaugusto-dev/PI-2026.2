import { RotateCw, TriangleAlert } from 'lucide-react'
import type { Cartao } from '@/components/analises/catalogo'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useKpi } from '@/hooks/useKpis'
import { useTamanhoElemento } from '@/hooks/useTamanhoElemento'
import type { Periodo } from '@/lib/periodo'
import { cn } from '@/lib/utils'

/**
 * Moldura de um cartão do painel: título, a frase que explica o número e o conteúdo, que recebe a altura
 * que sobrou (medida, não estimada — a descrição pode quebrar linha) para decidir quanto mostrar.
 * Ao trocar o período o conteúdo anterior fica a meia opacidade até o novo chegar, sem piscar skeleton.
 */
export function CartaoAnalise({ cartao, periodo }: { cartao: Cartao<unknown>; periodo: Periodo }) {
  const { data, isLoading, isError, isPlaceholderData, refetch } = useKpi<unknown>(cartao.consulta(periodo))
  const { ref: corpoRef, altura } = useTamanhoElemento<HTMLDivElement>()
  const { Conteudo } = cartao

  return (
    <Card className="h-full gap-3 p-4">
      <div>
        <h2 className="text-secao">{cartao.titulo}</h2>
        <p className="text-sm text-muted-foreground">{cartao.descricao}</p>
      </div>
      <div ref={corpoRef} className={cn('min-h-0 flex-1 transition-opacity', isPlaceholderData && 'opacity-50')}>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ) : isError ? (
          <div className="flex h-full flex-col items-start justify-center gap-2">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <TriangleAlert className="size-4" aria-hidden />
              Não foi possível carregar este número.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RotateCw />
              Tentar de novo
            </Button>
          </div>
        ) : vazio(data) ? (
          <p className="flex h-full items-center text-sm text-muted-foreground">Nenhum registro no período.</p>
        ) : (
          altura > 0 && <Conteudo dado={data} altura={altura} />
        )}
      </div>
    </Card>
  )
}

// ranking sem linha é "nada no período"; os retratos de agora e a evolução sempre têm o que mostrar
const vazio = (dado: unknown) => typeof dado === 'object' && dado !== null && 'itens' in dado && Array.isArray(dado.itens) && dado.itens.length === 0
