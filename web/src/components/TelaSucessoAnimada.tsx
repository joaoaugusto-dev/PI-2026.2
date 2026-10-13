import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const ATRASO_ICONE_MS = 400
const DURACAO_ICONE_VISIVEL_MS = 700
const DURACAO_TINTA_SAI_MS = 800
const DIGITACAO_MS_POR_LETRA = 30
const PAUSA_APOS_DIGITAR_MS = 500
const ATRASO_ICONE_BALCAO_MS = 150
const DURACAO_ICONE_VISIVEL_BALCAO_MS = 550

function medirAreaConteudo(contida?: boolean) {
  if (!contida || typeof document === 'undefined') return null
  const r = document.querySelector('[data-slot="sidebar-inset"]')?.getBoundingClientRect()
  if (!r) return null
  const topo = Math.max(r.top, 0)
  return { left: r.left, top: topo, width: r.width, height: Math.min(r.bottom, window.innerHeight) - topo }
}

/**
 * Tela cheia de sucesso (entrada no sistema, senha definida) e de "aguardando aprovação" — estilo tela de
 * finalização de compra: um círculo escuro gigante se
 * espalha feito tinta até cobrir a tela inteira (só `transform: scale`, um
 * elemento do tamanho da viewport nunca recalcula layout). O check aparece
 * no meio do preenchimento (não espera a tinta cobrir tudo pra não parecer
 * travado), segura um instante, depois a tinta recolhe e dissolve revelando
 * o conteúdo por trás. Reaproveitada tanto logo após o cadastro quanto
 * sempre que um almoxarife ainda inativo entra no sistema (`RotaProtegida`) e,
 * com `aoTerminarAnimacao`, como a celebração de senha definida pelo convite.
 */
export function TelaSucessoAnimada({
  aoSair,
  aoTerminarAnimacao,
  mensagem,
  contida,
}: {
  aoSair?: () => void
  /** Quando informado, a tela é só a animação: ao fim dela chama isto e não mostra o texto de "aguardando aprovação". */
  aoTerminarAnimacao?: () => void
  /** Frase digitada letra a letra sob o check (ex.: "Login realizado com sucesso"); a tinta espera ela terminar. */
  mensagem?: string
  /** A tinta enche só a área de conteúdo do app (o `<main>` ao lado da sidebar), sem fundo próprio, em vez da tela toda. */
  contida?: boolean
}) {
  // retângulo visível do <main> (fixo na viewport: rolagem da página não desloca o centro); remedido se a janela
  // for redimensionada ou a sidebar abrir/fechar durante a animação
  const [caixa, setCaixa] = useState(() => medirAreaConteudo(contida))
  useEffect(() => {
    if (!contida) return
    const alvo = document.querySelector('[data-slot="sidebar-inset"]')
    const remedir = () =>
      setCaixa((atual) => {
        const nova = medirAreaConteudo(contida)
        // mesma caixa: devolve o objeto anterior para o React não re-renderizar à toa
        const igual =
          atual && nova && atual.left === nova.left && atual.top === nova.top && atual.width === nova.width && atual.height === nova.height
        return igual ? atual : nova
      })
    window.addEventListener('resize', remedir)
    const observador = alvo ? new ResizeObserver(remedir) : null
    if (alvo) observador?.observe(alvo)
    return () => {
      window.removeEventListener('resize', remedir)
      observador?.disconnect()
    }
  }, [contida])
  const [fase, setFase] = useState<'tinta-entra' | 'tinta-sai' | 'conteudo'>('tinta-entra')
  const [iconeVisivel, setIconeVisivel] = useState(false)
  const [digitado, setDigitado] = useState('')
  // reduced-motion: a frase aparece inteira, sem digitar
  const semMovimento = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // contida = confirmação do balcão (retirada/devolução): com fila, a frase sai inteira e a tinta não segura a próxima operação
  const digitar = !!mensagem && !semMovimento && !contida
  const tempoDigitando = digitar ? mensagem.length * DIGITACAO_MS_POR_LETRA + PAUSA_APOS_DIGITAR_MS : 0
  const duracaoVisivel = contida ? DURACAO_ICONE_VISIVEL_BALCAO_MS : Math.max(DURACAO_ICONE_VISIVEL_MS, tempoDigitando)
  const atrasoIcone = contida ? ATRASO_ICONE_BALCAO_MS : ATRASO_ICONE_MS

  useEffect(() => {
    const t1 = window.setTimeout(() => setIconeVisivel(true), atrasoIcone)
    const t2 = window.setTimeout(() => setFase('tinta-sai'), atrasoIcone + duracaoVisivel)
    const t3 = window.setTimeout(
      () => setFase('conteudo'),
      atrasoIcone + duracaoVisivel + DURACAO_TINTA_SAI_MS,
    )
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [atrasoIcone, duracaoVisivel])

  // efeito de digitação: começa junto com o check
  useEffect(() => {
    if (!iconeVisivel || !mensagem) return
    if (!digitar) {
      setDigitado(mensagem)
      return
    }
    let n = 0
    const id = window.setInterval(() => {
      n += 1
      setDigitado(mensagem.slice(0, n))
      if (n >= mensagem.length) window.clearInterval(id)
    }, DIGITACAO_MS_POR_LETRA)
    return () => window.clearInterval(id)
  }, [iconeVisivel, mensagem, digitar])

  useEffect(() => {
    if (fase === 'conteudo') aoTerminarAnimacao?.()
  }, [fase, aoTerminarAnimacao])

  // portal no <body>: dentro de uma tela animada (`animate-entrada` deixa `transform`), o `fixed` viraria relativo a ela e a tinta não cobriria a viewport
  return createPortal(
    <div
      role="status"
      className={cn(
        'fixed z-50 flex items-center justify-center overflow-hidden',
        caixa ? 'rounded-xl' : 'inset-0 bg-background p-4',
        contida && fase === 'tinta-sai' && 'pointer-events-none',
      )}
      style={caixa ?? undefined}
    >
      {fase !== 'conteudo' && (
        <div
          aria-hidden
          className={cn(
            'absolute left-1/2 top-1/2 size-[300vmax] rounded-full bg-foreground',
            fase === 'tinta-sai' ? 'animate-tinta-sai' : 'animate-tinta-entra',
          )}
        />
      )}

      {iconeVisivel && fase !== 'conteudo' && (
        <div className="relative z-10 flex flex-col items-center gap-5 text-center">
          <CheckCircle2 className="size-24 animate-check-entra text-white" strokeWidth={1.5} />
          {mensagem && (
            <p className="text-titulo font-medium text-white">
              <span className="sr-only">{mensagem}</span>
              <span aria-hidden>
                {digitado}
                <span className="ml-0.5 inline-block h-[0.9em] w-0.5 translate-y-[0.1em] animate-pulse bg-white" />
              </span>
            </p>
          )}
        </div>
      )}

      {fase === 'conteudo' && !aoTerminarAnimacao && (
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
    </div>,
    document.body,
  )
}
