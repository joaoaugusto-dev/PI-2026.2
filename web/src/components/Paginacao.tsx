import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/** Anterior/Próxima com "Página X de Y · N <itens>"; some quando há uma página só. */
export function Paginacao({
  meta,
  page,
  onPage,
  itens,
}: {
  meta?: { page: number; totalPages: number; total: number }
  page: number
  onPage: (page: number) => void
  /** Plural do que está sendo listado ("empréstimos", "registros"). */
  itens: string
}) {
  if (!meta || meta.totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-2.5">
      <span className="text-sm font-medium">
        Página {meta.page} de {meta.totalPages}
        <span className="hidden font-normal text-muted-foreground sm:inline">
          {' '}
          · {meta.total} {itens}
        </span>
      </span>
      <div className="flex gap-2">
        <Button variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)} className="gap-1">
          <ChevronLeft className="size-4" /> Anterior
        </Button>
        <Button disabled={page >= meta.totalPages} onClick={() => onPage(page + 1)} className="gap-1">
          Próxima <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
