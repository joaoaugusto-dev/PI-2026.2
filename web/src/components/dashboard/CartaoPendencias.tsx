import { Children, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

const VISIVEIS = 4

/**
 * Cartão de uma lista de pendências do dashboard: título, contagem e as primeiras linhas. Os cartões
 * têm altura fixa (o painel cabe na tela sem rolagem); o que passa de VISIVEIS abre em "Mostrar tudo".
 */
export function CartaoPendencias({
  titulo,
  descricao,
  total,
  tom,
  vazio,
  carregando,
  children,
}: {
  titulo: string
  descricao: string
  total: number | undefined
  tom: string
  vazio: string
  carregando: boolean
  children: ReactNode
}) {
  const [aberto, setAberto] = useState(false)
  const itens = Children.toArray(children)

  return (
    <Card className="min-h-0 gap-2 overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-secao">{titulo}</h2>
          <p className="text-rotulo text-muted-foreground">{descricao}</p>
        </div>
        <div className="flex items-center gap-3">
          {itens.length > VISIVEIS && (
            <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
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
        <div className="lista-stagger flex min-h-0 flex-col divide-y overflow-y-auto">{itens.slice(0, VISIVEIS)}</div>
      ) : (
        <p className="flex flex-1 items-center justify-center text-corpo text-muted-foreground">{vazio}</p>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {titulo} · {total}
            </DialogTitle>
            <DialogDescription>{descricao}</DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[65vh] flex-col divide-y overflow-y-auto">{itens}</div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
