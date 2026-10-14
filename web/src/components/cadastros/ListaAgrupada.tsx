import { ChevronRight } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import type { Coluna } from './CadastroCrud'

// colunas de dado + coluna fixa de ações, iguais em grupo, unidade avulsa e unidade de grupo (alinham entre cartões).
// Só em telas largas (2xl); abaixo disso o cartão empilha (dados em linha quebrável, ações embaixo), sem rolagem lateral.
const GRADE =
  'flex flex-wrap items-center gap-x-4 gap-y-2 px-4 2xl:grid 2xl:grid-cols-[var(--grade)] 2xl:flex-nowrap'

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
  larguraAcoes = '26rem',
}: {
  colunas: Coluna<T>[]
  grupos: T[][]
  chave: (item: T) => string
  resumo: (itens: T[]) => ReactNode
  /** Ações do cabeçalho do grupo fechado/aberto (ex.: "+ Unidade"). */
  acoesGrupo: (primeiro: T) => ReactNode
  /** Ações de uma unidade (avulsa ou dentro do grupo). */
  acoesUnidade: (item: T, avulsa: boolean) => ReactNode
  larguraAcoes?: string
}) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set())
  const ultima = colunas.length - 1
  const grade = { '--grade': [...colunas.map((c) => c.largura ?? 'minmax(0,1fr)'), larguraAcoes].join(' ') } as CSSProperties
  // no cartão empilhado o rótulo da coluna aparece junto do valor (o cabeçalho só existe em 2xl)
  const rotulo = (c: Coluna<T>, i: number) =>
    i > 1 && <span className="mr-1 text-rotulo text-muted-foreground 2xl:hidden">{c.cabecalho}:</span>
  const alternar = (k: string) =>
    setAbertos((a) => {
      const n = new Set(a)
      if (!n.delete(k)) n.add(k)
      return n
    })

  return (
    <div className="flex flex-col gap-2" style={grade}>
      <div className={`${GRADE} hidden text-sm font-medium text-muted-foreground 2xl:grid`}>
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
                <div key={c.cabecalho} className={`min-w-0 ${i === 1 ? 'flex-1 basis-40' : ''}`}>
                  {rotulo(c, i)}
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
              <div className="flex basis-full flex-wrap justify-start gap-2 2xl:basis-auto 2xl:justify-end" onClick={(e) => e.stopPropagation()}>
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
                          <div
                            key={c.cabecalho}
                            className={`min-w-0 ${i === 1 ? 'flex-1 basis-40' : ''} ${i === ultima ? '' : 'text-muted-foreground'}`}
                          >
                            {rotulo(c, i)}
                            {i === 0 ? <span className="pl-6">{c.render(item)}</span> : c.render(item)}
                          </div>
                        ))}
                        <div className="flex basis-full flex-wrap justify-start gap-2 2xl:basis-auto 2xl:justify-end">
                          {acoesUnidade(item, false)}
                        </div>
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
