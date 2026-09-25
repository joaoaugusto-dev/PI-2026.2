import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const ATRASO_ICONE_MS = 400
const DURACAO_ICONE_VISIVEL_MS = 700
const DURACAO_TINTA_SAI_MS = 800

/**
 * Tela cheia de "cadastro enviado / aguardando aprovação" — estilo tela de
 * finalização de compra: um círculo escuro gigante se
 * espalha feito tinta até cobrir a tela inteira (só `transform: scale`, um
 * elemento do tamanho da viewport nunca recalcula layout). O check aparece
 * no meio do preenchimento (não espera a tinta cobrir tudo pra não parecer
 * travado), segura um instante, depois a tinta recolhe e dissolve revelando
 * o conteúdo por trás. Reaproveitada tanto logo após o cadastro quanto
 * sempre que um almoxarife ainda inativo entra no sistema (`RotaProtegida`).
 */
export function TelaAguardandoAprovacao({ aoSair }: { aoSair?: () => void }) {
  const [fase, setFase] = useState<'tinta-entra' | 'tinta-sai' | 'conteudo'>('tinta-entra')
  const [iconeVisivel, setIconeVisivel] = useState(false)

  useEffect(() => {
    const t1 = window.setTimeout(() => setIconeVisivel(true), ATRASO_ICONE_MS)
    const t2 = window.setTimeout(() => setFase('tinta-sai'), ATRASO_ICONE_MS + DURACAO_ICONE_VISIVEL_MS)
    const t3 = window.setTimeout(
      () => setFase('conteudo'),
      ATRASO_ICONE_MS + DURACAO_ICONE_VISIVEL_MS + DURACAO_TINTA_SAI_MS,
    )
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-background p-4">
      {fase !== 'conteudo' && (
        <div
          aria-hidden
          className={cn(
            'fixed left-1/2 top-1/2 size-[300vmax] rounded-full bg-foreground',
            fase === 'tinta-sai' ? 'animate-tinta-sai' : 'animate-tinta-entra',
          )}
        />
      )}

      {iconeVisivel && fase !== 'conteudo' && (
        <CheckCircle2 className="relative z-10 size-24 animate-check-entra text-white" strokeWidth={1.5} />
      )}

      {fase === 'conteudo' && (
        <div className="flex w-full max-w-md flex-col items-center gap-3 text-center animate-entrada">
          <CheckCircle2 className="size-16 shrink-0 text-status-disponivel" strokeWidth={1.5} />
          <h1 className="text-titulo">Cadastro enviado</h1>
          <p className="text-corpo text-muted-foreground">
            Sua conta foi criada e está aguardando aprovação de um administrador. Você vai poder entrar assim que
            ela for liberada.
          </p>
          {aoSair ? (
            <Button onClick={aoSair} className="mt-2 h-(--control-h) w-full">
              Sair
            </Button>
          ) : (
            <Button asChild className="mt-2 h-(--control-h) w-full">
              <Link to="/login">Voltar para o login</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
