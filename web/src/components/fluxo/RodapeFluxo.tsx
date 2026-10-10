import type { Ref } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

type RodapeFluxoProps = {
  rotuloUsuario: string
  usuario: string
  faltando: string[]
  textoBotao: string
  /** Mostra ícones nas mensagens de pendência (usado na devolução). */
  comIcones?: boolean
  /** Requisição em andamento: trava o botão para um clique duplo não enviar duas vezes. */
  enviando?: boolean
  /** Para a tela pôr o foco no botão (aí o Enter confirma) quando tudo já está preenchido. */
  botaoRef?: Ref<HTMLButtonElement>
}

/** Rodapé fixo das telas de retirada/devolução: responsável logado + confirmar. */
export function RodapeFluxo({ rotuloUsuario, usuario, faltando, textoBotao, comIcones, enviando, botaoRef }: RodapeFluxoProps) {
  const pendente = faltando.length > 0
  return (
    <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="min-w-0">
        {/* no celular o rodapé come a tela: o responsável vem do login, a linha só aparece de sm para cima */}
        <p className="hidden text-corpo sm:block">
          {rotuloUsuario}: <span className="font-medium">{usuario}</span>
        </p>
        <p
          className={`flex items-center gap-1.5 text-sm ${pendente ? 'text-status-atraso' : 'text-status-disponivel'}`}
        >
          {comIcones &&
            (pendente ? (
              <AlertTriangle className="size-4 shrink-0" />
            ) : (
              <CheckCircle2 className="size-4 shrink-0" />
            ))}
          {pendente ? `Falta preencher: ${faltando.join(', ')}` : 'Pronto para confirmar'}
        </p>
      </div>
      <button
        ref={botaoRef}
        type="submit"
        disabled={pendente || enviando}
        className="h-(--control-h-fluxo) shrink-0 rounded-lg bg-brand-red px-6 text-corpo font-medium text-white transition-colors hover:bg-brand-red-dark active:translate-y-px disabled:pointer-events-none disabled:opacity-40"
      >
        {enviando ? 'Registrando…' : textoBotao}
      </button>
    </div>
  )
}
