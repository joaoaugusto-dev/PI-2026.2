import { describe, expect, it } from 'vitest'
import { lerCsv, neutralizarFormula } from '@/lib/csv'

describe('lerCsv', () => {
  it('lê ; e , com aspas, BOM e linhas em branco', () => {
    expect(lerCsv('﻿Nome;Setor\n"Silva; João";Usinagem\n\n')).toEqual([{ nome: 'Silva; João', setor: 'Usinagem' }])
    expect(lerCsv('nome,obs\r\nA,"diz ""oi"""\r\n')).toEqual([{ nome: 'A', obs: 'diz "oi"' }])
  })
})

describe('neutralizarFormula', () => {
  it('prefixa texto que o Excel leria como fórmula', () => {
    for (const perigoso of ['=1+1', "+cmd|' /C calc'!A0", '-2+3', '@SUM(A1)', '\t=x', '\r=x']) {
      expect(neutralizarFormula(perigoso)).toBe(`'${perigoso}`)
    }
  })

  it('não mexe em texto comum nem em números', () => {
    for (const ok of ['Furadeira', 'SF000045', '01/09/2026', '-5', '+12,5', '3.14', '', 'a=b']) {
      expect(neutralizarFormula(ok)).toBe(ok)
    }
  })
})
