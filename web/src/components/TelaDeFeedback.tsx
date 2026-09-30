import type { ReactNode } from 'react'
import { TexturaFerramentas } from '@/components/TexturaFerramentas'
import { Card, CardContent } from '@/components/ui/Card'

/**
 * Moldura das telas de feedback de página inteira (404, erro inesperado):
 * textura de ferramentas ao fundo e um card branco discreto com logo,
 * ilustração, texto, ações e a etiqueta. Os seis blocos entram em cascata.
 */
export function TelaDeFeedback({
  ilustracao,
  titulo,
  descricao,
  acoes,
  etiqueta,
}: {
  ilustracao: ReactNode
  titulo: string
  descricao: ReactNode
  acoes: ReactNode
  etiqueta: ReactNode
}) {
  return (
    <div className="relative isolate flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden p-6">
      <TexturaFerramentas />
      <Card className="w-full max-w-xl animate-entrada rounded-3xl shadow-sm ring-foreground/10">
        <CardContent className="lista-stagger flex flex-col items-center gap-4 py-4 text-center">
          <img src="/brand/soufer-assinatura.png" alt="Soufer Tools" className="h-8 w-auto" />
          {ilustracao}
          <h1 className="text-titulo">{titulo}</h1>
          <div className="max-w-md text-corpo text-muted-foreground">{descricao}</div>
          <div className="flex flex-wrap justify-center gap-3">{acoes}</div>
          {etiqueta}
        </CardContent>
      </Card>
    </div>
  )
}
