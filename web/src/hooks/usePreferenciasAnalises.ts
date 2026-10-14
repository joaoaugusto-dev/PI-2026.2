import { useEffect, useMemo, useState } from 'react'
import { CARTOES } from '@/components/analises/catalogo'
import { erroDoPeriodo, periodoDoAtalho, type Atalho, type Periodo } from '@/lib/periodo'

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

/**
 * Painel de análises do jeito de cada pessoa (cartões, ordem, tamanho e período), em `localStorage` por
 * usuário: é conveniência deste navegador, como o som de confirmação. Se o armazenamento falhar (aba
 * anônima, bloqueado), o painel abre no padrão. Cartão novo no catálogo entra no fim; cartão que saiu
 * do catálogo é descartado.
 */
export function usePreferenciasAnalises(usuarioId: number | undefined) {
  const chave = `soufer:analises:v1:${usuarioId ?? 'anonimo'}`
  const [prefs, setPrefs] = useState<Preferencias>(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(chave) ?? 'null') as Partial<Preferencias> | null
      if (!salvo) return padrao()
      const ids = CARTOES.map((c) => c.id)
      const ordem = (salvo.ordem ?? []).filter((id) => ids.includes(id))
      return {
        ...padrao(),
        ...salvo,
        ordem: [...ordem, ...ids.filter((id) => !ordem.includes(id))],
        ocultos: (salvo.ocultos ?? []).filter((id) => ids.includes(id)),
      }
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
