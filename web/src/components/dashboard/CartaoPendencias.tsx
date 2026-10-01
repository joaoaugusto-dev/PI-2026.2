import { useState, type ReactNode } from 'react'
import { Paginacao } from '@/components/Paginacao'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { useListaDashboard, type NomeLista } from '@/hooks/useDashboard'
import { cn } from '@/lib/utils'

/**
 * Cartão de uma lista de pendências do dashboard: título, contagem e as primeiras linhas (as que a
 * API manda no resumo). Os cartões têm altura fixa (o painel cabe na tela sem rolagem); quando há
 * mais linhas que as do cartão, "Mostrar tudo" abre a lista completa, paginada, num pop-up.
 */
export function CartaoPendencias<T>({
  lista,
  titulo,
  descricao,
  total,
  itens,
  renderItem,
  tom,
  vazio,
  carregando,
}: {
  lista: NomeLista
  titulo: string
  descricao: string
  total: number | undefined
  itens: T[] | undefined
  renderItem: (item: T) => ReactNode
  tom: string
  vazio: string
  carregando: boolean
}) {
  const [aberto, setAberto] = useState(false)
  const [page, setPage] = useState(1)
  const completa = useListaDashboard<T>(lista, page, aberto)
  const temMais = (total ?? 0) > (itens?.length ?? 0)

  function alternar(abrir: boolean) {
    setAberto(abrir)
    if (abrir) setPage(1)
  }

  return (
    <Card className="min-h-0 gap-2 overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-secao">{titulo}</h2>
          <p className="text-rotulo text-muted-foreground">{descricao}</p>
        </div>
        <div className="flex items-center gap-3">
          {temMais && (
            <Button variant="outline" size="sm" onClick={() => alternar(true)}>
              Mostrar tudo
            </Button>
          )}
          {carregando ? (
            <Skeleton className="h-9 w-10" />
          ) : (
            <span className={cn('text-kpi leading-none tabular-nums', total ? tom : 'text-muted-foreground')}>
              {total ?? 0}
            </span>
          )}
        </div>
      </div>

      {carregando ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ) : total ? (
        <div className="lista-stagger flex min-h-0 flex-col divide-y overflow-y-auto">{itens?.map(renderItem)}</div>
      ) : (
        <p className="flex flex-1 items-center justify-center text-corpo text-muted-foreground">{vazio}</p>
      )}

      <Dialog open={aberto} onOpenChange={alternar}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {titulo} · {total}
            </DialogTitle>
            <DialogDescription>{descricao}</DialogDescription>
          </DialogHeader>
          {completa.isError ? (
            <p className="py-6 text-center text-corpo text-destructive">Não foi possível carregar a lista.</p>
          ) : !completa.data ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          ) : (
            <div className="flex max-h-[60vh] flex-col divide-y overflow-y-auto">
              {completa.data.data.map(renderItem)}
            </div>
          )}
          <Paginacao meta={completa.data?.meta} page={page} onPage={setPage} itens="registros" />
        </DialogContent>
      </Dialog>
    </Card>
  )
}
