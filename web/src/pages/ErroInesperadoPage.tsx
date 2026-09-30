import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { EtiquetaNaoLocalizada } from '@/components/EtiquetaNaoLocalizada'
import { IlustracaoErro } from '@/components/IlustracaoErro'
import { TelaDeFeedback } from '@/components/TelaDeFeedback'
import { Button } from '@/components/ui/Button'
import { NaoEncontradaPage } from '@/pages/NaoEncontradaPage'

/**
 * `errorElement` das rotas: pega erro de renderização, de loader e resposta de
 * erro do router, no lugar da tela padrão do React Router. Em desenvolvimento
 * mostra a mensagem do erro; em produção ela nunca vai pra tela.
 */
export function ErroInesperadoPage() {
  const erro = useRouteError()

  if (isRouteErrorResponse(erro) && erro.status === 404) return <NaoEncontradaPage />

  const detalhe = isRouteErrorResponse(erro)
    ? `${erro.status} ${erro.statusText}`
    : erro instanceof Error
      ? erro.message
      : String(erro)

  return (
    <TelaDeFeedback
      ilustracao={<IlustracaoErro codigo="500" className="w-full max-w-sm text-foreground sm:max-w-md" />}
      titulo="Algo travou na bancada"
      descricao={
        <>
          <p>Aconteceu um erro inesperado nesta tela. Tente de novo; se continuar, avise a equipe.</p>
          {import.meta.env.DEV && (
            <code className="mt-3 block rounded-md bg-muted px-3 py-2 text-left font-mono text-rotulo break-words">
              {detalhe}
            </code>
          )}
        </>
      }
      acoes={
        <>
          <Button className="h-(--control-h) px-6 text-corpo" onClick={() => window.location.reload()}>
            Tentar de novo
          </Button>
          <Button asChild variant="outline" className="h-(--control-h) px-6 text-corpo">
            <Link to="/" reloadDocument>
              Voltar ao início
            </Link>
          </Button>
        </>
      }
      etiqueta={<EtiquetaNaoLocalizada codigo="SF000500" item="Falha inesperada" />}
    />
  )
}
