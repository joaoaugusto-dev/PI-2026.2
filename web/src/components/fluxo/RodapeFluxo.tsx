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
    // no celular o rodapé fixo não pode comer a tela: só o resumo curto e o botão
    <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:gap-4 sm:px-6">
      <div className="min-w-0">
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
          {pendente ? (
            <>
              <span className="sm:hidden">
                {faltando.length === 1 ? `Falta: ${faltando[0]}` : `Faltam ${faltando.length} itens`}
              </span>
              <span className="hidden sm:inline">Falta preencher: {faltando.join(', ')}</span>
            </>
          ) : (
            'Pronto — Enter confirma'
          )}
        </p>
      </div>
      <button
        ref={botaoRef}
        type="submit"
        disabled={pendente || enviando}
        className="h-(--control-h-fluxo) shrink-0 rounded-lg bg-brand-red px-5 text-corpo font-medium text-white transition-colors hover:bg-brand-red-dark active:translate-y-px disabled:pointer-events-none disabled:opacity-40 sm:px-6"
      >
        {enviando ? 'Registrando…' : textoBotao}
      </button>
    </div>
  )
}
