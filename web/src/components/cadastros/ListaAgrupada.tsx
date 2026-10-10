import { ChevronRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { Coluna } from './CadastroCrud'

// colunas de dado + coluna fixa de ações, iguais em grupo, unidade avulsa e unidade de grupo (alinham entre cartões)
const GRADE = 'grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_24rem] items-center gap-4 px-4'

/**
 * Lista de cadastro com unidades iguais agrupadas: um cartão por grupo (ou por unidade avulsa), com
 * respiro entre eles, e as unidades do grupo revelam-se por baixo ao abrir.
 * ponytail: a abertura anima `grid-template-rows` (1fr↔0fr), a mesma exceção do SinoNotificacoes;
 * vale para listas curtas (poucas unidades por grupo), não replicar em tabela longa.
 */
export function ListaAgrupada<T extends { id: number }>({
  colunas,
  grupos,
  chave,
  resumo,
  acoesGrupo,
  acoesUnidade,
}: {
  colunas: Coluna<T>[]
  grupos: T[][]
  chave: (item: T) => string
  resumo: (itens: T[]) => ReactNode
  /** Ações do cabeçalho do grupo fechado/aberto (ex.: "+ Unidade"). */
  acoesGrupo: (primeiro: T) => ReactNode
  /** Ações de uma unidade (avulsa ou dentro do grupo). */
  acoesUnidade: (item: T, avulsa: boolean) => ReactNode
}) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set())
  const ultima = colunas.length - 1
  const alternar = (k: string) =>
    setAbertos((a) => {
      const n = new Set(a)
      if (!n.delete(k)) n.add(k)
      return n
    })

  return (
    <div className="flex min-w-[1000px] flex-col gap-2">
      <div className={`${GRADE} text-sm font-medium text-muted-foreground`}>
        {colunas.map((c, i) => (
          <span key={c.cabecalho} className={i === 0 ? 'pl-6' : undefined}>
            {c.cabecalho}
          </span>
        ))}
        <span className="text-right">Ação</span>
      </div>

      {grupos.map((itens) => {
        const k = chave(itens[0])
        const unica = itens.length === 1
        const aberto = abertos.has(k)
        return (
          <div
            key={k + itens[0].id}
            className={`overflow-hidden rounded-lg border bg-card transition-shadow ${aberto ? 'shadow-sm' : ''}`}
          >
            {/* unidade avulsa: sem seta nem abertura; grupo: a linha inteira alterna */}
            <div
              className={`${GRADE} py-3 ${unica ? '' : 'cursor-pointer hover:bg-muted/40'}`}
              onClick={unica ? undefined : () => alternar(k)}
            >
              {colunas.map((c, i) => (
                <div key={c.cabecalho} className="min-w-0">
                  {i === 0 ? (
                    <span className="flex items-center gap-2">
                      {unica ? (
                        <span className="size-4 shrink-0" />
                      ) : (
                        <ChevronRight
                          aria-hidden
                          className={`size-4 shrink-0 text-muted-foreground transition-transform ${aberto ? 'rotate-90' : ''}`}
                        />
                      )}
                      <span className="font-medium">{c.render(itens[0])}</span>
                    </span>
                  ) : i === ultima && !unica ? (
                    <button type="button" aria-expanded={aberto} className="font-medium">
                      {resumo(itens)}
                    </button>
                  ) : (
                    c.render(itens[0])
                  )}
                </div>
              ))}
              <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                {unica ? acoesUnidade(itens[0], true) : acoesGrupo(itens[0])}
              </div>
            </div>

            {!unica && (
              <div
                inert={!aberto}
                className={`grid transition-[grid-template-rows] ${aberto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className={`border-t bg-muted/40 transition-opacity ${aberto ? 'opacity-100' : 'opacity-0'}`}>
                    {itens.map((item) => (
                      <div key={item.id} className={`${GRADE} py-2.5 not-first:border-t`}>
                        {colunas.map((c, i) => (
                          <div key={c.cabecalho} className={`min-w-0 ${i === ultima ? '' : 'text-muted-foreground'}`}>
                            {i === 0 ? <span className="pl-6">{c.render(item)}</span> : c.render(item)}
                          </div>
                        ))}
                        <div className="flex justify-end gap-2">{acoesUnidade(item, false)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
