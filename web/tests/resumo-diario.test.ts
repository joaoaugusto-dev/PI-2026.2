import { describe, expect, it } from 'vitest'
import { devoAvisarResumo, textoResumo } from '../src/lib/resumo-diario'

// 2026-10-07 é quarta; 10-10 é sábado; 10-11 é domingo (datas locais, sem fuso no construtor)
const em = (dia: number, h: number, m: number) => new Date(2026, 9, dia, h, m)

describe('devoAvisarResumo', () => {
  it('só a partir das 08:30 em dia útil', () => {
    expect(devoAvisarResumo(em(7, 8, 29), null)).toBe(false)
    expect(devoAvisarResumo(em(7, 8, 30), null)).toBe(true)
    expect(devoAvisarResumo(em(7, 15, 0), null)).toBe(true) // aba aberta tarde: avisa na primeira carga
  })
  it('não avisa no fim de semana', () => {
    expect(devoAvisarResumo(em(10, 9, 0), null)).toBe(false)
    expect(devoAvisarResumo(em(11, 9, 0), null)).toBe(false)
  })
  it('avisa uma vez por dia', () => {
    expect(devoAvisarResumo(em(7, 9, 0), '2026-10-07')).toBe(false)
    expect(devoAvisarResumo(em(7, 9, 0), '2026-10-06')).toBe(true)
  })
})

describe('textoResumo', () => {
  it('conta por tipo e ignora os demais', () => {
    expect(textoResumo([{ tipo: 'atraso' }, { tipo: 'atraso' }, { tipo: 'devolucao_hoje' }, { tipo: 'sistema' }])).toBe(
      '1 devolução(ões) prevista(s) para hoje · 2 empréstimo(s) atrasado(s)'
    )
  })
  it('null sem atraso nem devolução hoje', () => {
    expect(textoResumo([])).toBeNull()
    expect(textoResumo([{ tipo: 'sistema' }])).toBeNull()
  })
})
