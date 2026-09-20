import { Skeleton } from '@/components/ui/Skeleton'

type EsqueletoListaProps = {
  linhas: number
  /** Classes de altura/largura de cada linha. */
  linhaClassName: string
  className?: string
}

export function EsqueletoLista({ linhas, linhaClassName, className }: EsqueletoListaProps) {
  return (
    <div className={className}>
      {Array.from({ length: linhas }).map((_, i) => (
        <Skeleton key={i} className={linhaClassName} />
      ))}
    </div>
  )
}
