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
    <div className="flex items-center justify-end gap-3">
      <span className="text-rotulo text-muted-foreground">
        Página {meta.page} de {meta.totalPages} · {meta.total} {itens}
      </span>
      <Button
        size="icon"
        variant="outline"
        aria-label="Página anterior"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        <ChevronLeft />
      </Button>
      <Button
        size="icon"
        variant="outline"
        aria-label="Próxima página"
        disabled={page >= meta.totalPages}
        onClick={() => onPage(page + 1)}
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
