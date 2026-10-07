import { describe, expect, it } from 'vitest'
import { dataHoraBR } from '@/lib/formatar'

describe('dataHoraBR', () => {
  it('formata timestamp no fuso de Brasília', () => {
    expect(dataHoraBR('2026-10-06T18:54:00.000Z')).toBe('06/10/2026 15:54')
  })
  it('vira o dia em UTC-3 perto da meia-noite', () => {
    expect(dataHoraBR('2026-10-07T01:30:00Z')).toBe('06/10/2026 22:30')
  })
  it('texto só-data fica sem hora e sem deslocar o dia', () => {
    expect(dataHoraBR('2026-10-07')).toBe('07/10/2026')
  })
  it('vazio vira traço', () => {
    expect(dataHoraBR(null)).toBe('—')
  })
})
