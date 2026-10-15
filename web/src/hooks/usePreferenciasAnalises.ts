import { useEffect, useMemo, useState } from 'react'
import { CARTOES } from '@/components/analises/catalogo'
import { ATALHOS, erroDoPeriodo, periodoDoAtalho, type Atalho, type Periodo } from '@/lib/periodo'

export type Tamanho = 'P' | 'M' | 'G'

/** Quanto cada tamanho multiplica a proporção do cartão no layout justificado. */
export const FATOR_TAMANHO: Record<Tamanho, number> = { P: 0.75, M: 1, G: 1.5 }

export interface Preferencias {
  ordem: string[]
  ocultos: string[]
  tamanhos: Record<string, Tamanho>
  atalho: Atalho
  personalizado: Periodo
}

const padrao = (): Preferencias => ({
  ordem: CARTOES.map((c) => c.id),
  ocultos: [],
  tamanhos: {},
  atalho: '30d',
  personalizado: periodoDoAtalho('30d'),
})

const ATALHOS_VALIDOS: string[] = [...ATALHOS.map((a) => a.id), 'personalizado']

/**
 * Lê o que estava salvo, campo a campo: o que não bate com o formato atual (atalho que não existe mais,
 * tamanho desconhecido, período malformado, JSON quebrado) volta ao padrão em vez de derrubar a tela.
 * Cartão novo no catálogo entra no fim; cartão que saiu do catálogo é descartado.
 */
export function lerPreferencias(texto: string | null, ids: string[]): Preferencias {
  const base = { ...padrao(), ordem: ids }
  let salvo: Record<string, unknown>
  try {
    const lido: unknown = JSON.parse(texto ?? 'null')
    if (typeof lido !== 'object' || lido === null || Array.isArray(lido)) return base
    salvo = lido as Record<string, unknown>
  } catch {
    return base
  }
  const lista = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && ids.includes(x)) : [])
  const ordem = [...new Set(lista(salvo.ordem))]
  const tamanhos: Record<string, Tamanho> = {}
  if (typeof salvo.tamanhos === 'object' && salvo.tamanhos !== null) {
    for (const [id, t] of Object.entries(salvo.tamanhos)) if (ids.includes(id) && typeof t === 'string' && Object.hasOwn(FATOR_TAMANHO, t)) tamanhos[id] = t as Tamanho
  }
  const pers = salvo.personalizado as Partial<Periodo> | null | undefined
  // período salvo meio digitado ou editado à mão (formato, ordem, 366 dias) não volta: cai no padrão
  const candidato = { de: String(pers?.de), ate: String(pers?.ate) }
  const periodoSalvo = typeof pers?.de === 'string' && typeof pers.ate === 'string' && erroDoPeriodo(candidato) === null ? candidato : base.personalizado
  return {
    ordem: [...ordem, ...ids.filter((id) => !ordem.includes(id))],
    ocultos: lista(salvo.ocultos),
    tamanhos,
    atalho: typeof salvo.atalho === 'string' && ATALHOS_VALIDOS.includes(salvo.atalho) ? (salvo.atalho as Atalho) : base.atalho,
    personalizado: periodoSalvo,
  }
}

/**
 * Painel de análises do jeito de cada pessoa (cartões, ordem, tamanho e período), em `localStorage` por
 * usuário: é conveniência deste navegador, como o som de confirmação. Se o armazenamento falhar (aba
 * anônima, bloqueado), o painel abre no padrão. A chave é lida só na montagem: o painel desmonta no
 * logout (a rota protegida redireciona para o login), então outra conta sempre monta do zero.
 */
export function usePreferenciasAnalises(usuarioId: number | undefined) {
  const chave = `soufer:analises:v1:${usuarioId ?? 'anonimo'}`
  const [prefs, setPrefs] = useState<Preferencias>(() => {
    try {
      return lerPreferencias(localStorage.getItem(chave), CARTOES.map((c) => c.id))
    } catch {
      return padrao()
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(chave, JSON.stringify(prefs))
    } catch {
      // sem armazenamento a preferência vale só até fechar a aba
    }
  }, [chave, prefs])

  // atalho é recalculado a cada render: "30 dias" aberto amanhã já é outro intervalo
  const periodo = useMemo(
    () => (prefs.atalho === 'personalizado' ? prefs.personalizado : periodoDoAtalho(prefs.atalho)),
    [prefs.atalho, prefs.personalizado],
  )

  return {
    prefs,
    periodo,
    periodoValido: erroDoPeriodo(periodo) === null,
    alterar: (mudanca: Partial<Preferencias>) => setPrefs((p) => ({ ...p, ...mudanca })),
    restaurar: () => setPrefs((p) => ({ ...padrao(), atalho: p.atalho, personalizado: p.personalizado })),
  }
}
