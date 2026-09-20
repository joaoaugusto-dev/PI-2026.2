import type { ReactNode } from 'react'

type SecaoFluxoProps = {
  titulo: string
  descricao?: string
  children: ReactNode
}

export function SecaoFluxo({ titulo, descricao, children }: SecaoFluxoProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-secao">{titulo}</h2>
        {descricao && <p className="text-corpo text-muted-foreground">{descricao}</p>}
      </div>
      {children}
    </section>
  )
}
