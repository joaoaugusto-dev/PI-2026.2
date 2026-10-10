import type { ReactNode } from 'react'

/** Lista clicável dos candidatos quando a busca por nome devolve vários: escolher preenche o campo com o identificador exato. */
export function OpcoesAmbiguas({
  titulo,
  opcoes,
  aoEscolher,
}: {
  titulo: string
  /** `extra` vai à direita da linha (ex.: status da ferramenta, quem está com ela). */
  opcoes: { chave: string | number; identificador: string; rotulo: string; extra?: ReactNode }[]
  aoEscolher: (identificador: string) => void
}) {
  return (
    <div className="space-y-2" role="group" aria-label={titulo}>
      {/* escolher entre vários é um passo normal, não um erro: texto neutro */}
      <p className="text-sm text-muted-foreground">{titulo}</p>
      <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
        {opcoes.map((o) => (
          <li key={o.chave}>
            <button
              type="button"
              onClick={() => aoEscolher(o.identificador)}
              className="flex min-h-12 w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-corpo hover:bg-muted focus-visible:border-brand-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/20"
            >
              <span className="shrink-0 font-mono text-muted-foreground">{o.identificador}</span>
              <span className="min-w-0 flex-1">{o.rotulo}</span>
              {o.extra}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
