import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icone: LucideIcon
  titulo: string
  descricao?: string
}

export function EmptyState({ icone: Icone, titulo, descricao }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <Icone className="size-8 text-muted-foreground" />
      <p className="text-corpo font-medium">{titulo}</p>
      {descricao && <p className="text-corpo text-muted-foreground">{descricao}</p>}
    </div>
  )
}
