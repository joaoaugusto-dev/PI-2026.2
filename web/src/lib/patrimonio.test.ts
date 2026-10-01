import { describe, expect, it } from 'vitest'
import { escolherPorCodigo, parseCodigoPatrimonio } from '@/lib/patrimonio'

describe('parseCodigoPatrimonio', () => {
  it('aceita prefixo SF, zeros à esquerda e mais de 4 dígitos', () => {
    expect(parseCodigoPatrimonio('000053')).toBe(53)
    expect(parseCodigoPatrimonio('sf53')).toBe(53)
    expect(parseCodigoPatrimonio('SF012345')).toBe(12345)
    expect(parseCodigoPatrimonio('0')).toBe(0)
  })

  it('nome não é código', () => {
    expect(parseCodigoPatrimonio('chave 1/4')).toBeNull()
    expect(parseCodigoPatrimonio('')).toBeNull()
  })
})

describe('escolherPorCodigo', () => {
  const a = { codigo: 1, nome: 'Chave de fenda 1/4' }
  const b = { codigo: 2, nome: 'Chave de fenda 3/8' }
  const codigoDe = (f: { codigo: number }) => f.codigo

  it('código exato vence os demais resultados', () => {
    expect(escolherPorCodigo([a, b], '000002', codigoDe).item).toBe(b)
  })

  it('nome com dois resultados não escolhe nenhum', () => {
    expect(escolherPorCodigo([a, b], 'chave de fenda', codigoDe)).toEqual({ item: null, ambiguos: [a, b] })
  })

  it('um único resultado ou nenhum', () => {
    expect(escolherPorCodigo([a], 'chave', codigoDe).item).toBe(a)
    expect(escolherPorCodigo([], 'xyz', codigoDe)).toEqual({ item: null, ambiguos: [] })
  })
})
