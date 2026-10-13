/** `SF53`, `000053` ou `53` -> 53; nome (qualquer outra coisa) -> null. Número grande demais para ser inteiro seguro (colagem acidental) também -> null. */
export function parseCodigoPatrimonio(termo: string) {
  const m = /^(?:sf)?0*(\d+)$/i.exec(termo.trim())
  const n = m ? Number(m[1]) : NaN
  return Number.isSafeInteger(n) ? n : null
}

export interface Escolha<T> {
  item: T | null
  /** Vários resultados sem código exato: a tela pede o código em vez de adivinhar (balcão bipa sem ler). */
  ambiguos: T[]
}

export function escolherPorCodigo<T>(candidatos: T[], termo: string, codigoDe: (c: T) => number | null): Escolha<T> {
  const codigo = parseCodigoPatrimonio(termo)
  const exato = codigo === null ? undefined : candidatos.find((c) => codigoDe(c) === codigo)
  if (exato) return { item: exato, ambiguos: [] }
  if (candidatos.length <= 1) return { item: candidatos[0] ?? null, ambiguos: [] }
  return { item: null, ambiguos: candidatos }
}
