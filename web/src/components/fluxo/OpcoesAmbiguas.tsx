/** Lista clicável dos candidatos quando a busca por nome devolve vários: escolher preenche o campo com o identificador exato. */
export function OpcoesAmbiguas({
  titulo,
  opcoes,
  aoEscolher,
}: {
  titulo: string
  opcoes: { chave: string | number; identificador: string; rotulo: string }[]
  aoEscolher: (identificador: string) => void
}) {
  return (
    <div className="space-y-2" role="group" aria-label={titulo}>
      <p className="text-sm text-destructive">{titulo}</p>
      <ul className="flex flex-col gap-1">
        {opcoes.map((o) => (
          <li key={o.chave}>
            <button
              type="button"
              onClick={() => aoEscolher(o.identificador)}
              className="flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-corpo hover:bg-muted focus-visible:border-brand-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/20"
            >
              <span className="font-mono text-muted-foreground">{o.identificador}</span>
              <span>{o.rotulo}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
