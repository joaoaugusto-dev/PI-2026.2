import { AlertTriangle, CheckCircle2 } from 'lucide-react'

type RodapeFluxoProps = {
  rotuloUsuario: string
  usuario: string
  faltando: string[]
  textoBotao: string
  /** Mostra ícones nas mensagens de pendência (usado na devolução). */
  comIcones?: boolean
}

/** Rodapé fixo das telas de retirada/devolução: responsável logado + confirmar. */
export function RodapeFluxo({ rotuloUsuario, usuario, faltando, textoBotao, comIcones }: RodapeFluxoProps) {
  const pendente = faltando.length > 0
  return (
    <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t bg-background/95 px-6 py-3 backdrop-blur">
      <div>
        <p className="text-corpo">
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
        type="submit"
        disabled={pendente}
        className="h-(--control-h-fluxo) shrink-0 rounded-lg bg-brand-red px-6 text-corpo font-medium text-white transition-colors hover:bg-brand-red-dark active:translate-y-px disabled:pointer-events-none disabled:opacity-40"
      >
        {textoBotao}
      </button>
    </div>
  )
}
