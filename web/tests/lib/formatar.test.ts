import { describe, expect, it } from 'vitest'
import { dataBR, dataHoraBR, diasEntre, hojeBrasilia, prazoBR, quandoBR, rotuloCondicao } from '@/lib/formatar'

describe('dataBR', () => {
  it('data sem hora não recua um dia por causa do fuso', () => {
    expect(dataBR('2026-09-30')).toBe('30/09/2026')
    expect(dataBR('2026-01-01')).toBe('01/01/2026')
  })

  it('timestamp aparece no dia de Brasília (02:59 UTC ainda é o dia anterior)', () => {
    expect(dataBR('2026-10-01T02:59:59.000Z')).toBe('30/09/2026')
    expect(dataBR('2026-10-01T03:00:00.000Z')).toBe('01/10/2026')
  })

  it('vazio vira travessão', () => {
    expect(dataBR(null)).toBe('—')
    expect(dataBR(undefined)).toBe('—')
  })
})

describe('rotuloCondicao', () => {
  it('rotula condições e humaniza valores desconhecidos', () => {
    expect(rotuloCondicao('avaria')).toBe('Avaria')
    expect(rotuloCondicao('em_reparo')).toBe('Em reparo')
  })
})

describe('hojeBrasilia', () => {
  it('usa a data de Brasília, não a do UTC (02:30 UTC ainda é o dia anterior)', () => {
    expect(hojeBrasilia(new Date('2026-10-01T02:30:00Z'))).toEqual({ iso: '2026-09-30', ano: 2026, mes: 8, dia: 30 })
    expect(hojeBrasilia(new Date('2026-10-01T03:30:00Z')).iso).toBe('2026-10-01')
  })
})

describe('diasEntre', () => {
  it('conta em dias de Brasília, não de UTC', () => {
    // 01/10 00:30 em Brasília (03:30 UTC) contra prazo 30/09 -> 1 dia de atraso
    expect(diasEntre(new Date('2026-10-01T03:30:00Z'), '2026-09-30')).toBe(1)
    // 30/09 22:00 em Brasília (01:00 UTC do dia 1º) ainda é o dia do prazo
    expect(diasEntre(new Date('2026-10-01T01:00:00Z'), '2026-09-30')).toBe(0)
    expect(diasEntre('2026-09-30T14:00:00Z', '2026-10-02T02:00:00Z')).toBe(-1)
  })
})

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

  it('vazio vira travessão', () => {
    expect(dataHoraBR(null)).toBe('—')
  })
})

describe('quandoBR / prazoBR', () => {
  // 09/10/2026 21:55 em Brasília
  const agora = new Date('2026-10-10T00:55:00.000Z')

  it('saída de hoje e de ontem vira texto curto com hora; mais antiga vira dias', () => {
    expect(quandoBR('2026-10-10T00:53:00.000Z', agora)).toBe('hoje às 21:53')
    expect(quandoBR('2026-10-08T11:10:00.000Z', agora)).toBe('ontem às 08:10')
    expect(quandoBR('2026-10-07T12:00:00.000Z', agora)).toBe('07/10 · há 2 dias')
  })

  it('prazo relativo, inclusive no fim do dia de Brasília (02:59 UTC ainda é hoje)', () => {
    expect(prazoBR('2026-10-10T02:59:59.000Z', agora)).toBe('hoje')
    expect(prazoBR('2026-10-11T02:59:59.000Z', agora)).toBe('amanhã')
    expect(prazoBR('2026-10-13T02:59:59.000Z', agora)).toBe('em 3 dias')
    expect(prazoBR('2026-10-08T02:59:59.000Z', agora)).toBe('atrasada 2 dias')
    expect(prazoBR('2026-10-09T02:59:59.000Z', agora)).toBe('atrasada 1 dia')
  })
})
