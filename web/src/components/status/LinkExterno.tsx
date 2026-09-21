import type { ElementType } from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type LinkExternoProps = {
  href: string
  icone: ElementType<{ className?: string }>
  children: string
}

export function LinkExterno({ href, icone: Icone, children }: LinkExternoProps) {
  return (
    <Button variant="outline" size="sm" asChild className="w-full justify-between text-rotulo">
      <a href={href} target="_blank" rel="noopener noreferrer">
        <span className="flex items-center gap-2">
          <Icone className="size-3.5" />
          {children}
        </span>
        <ExternalLink className="size-3 text-muted-foreground" />
      </a>
    </Button>
  )
}
