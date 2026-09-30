import { describe, expect, it } from 'vitest'
import { lerCsv } from '@/lib/csv'

describe('lerCsv', () => {
  it('lê ; e , com aspas, BOM e linhas em branco', () => {
    expect(lerCsv('﻿Nome;Setor\n"Silva; João";Usinagem\n\n')).toEqual([{ nome: 'Silva; João', setor: 'Usinagem' }])
    expect(lerCsv('nome,obs\r\nA,"diz ""oi"""\r\n')).toEqual([{ nome: 'A', obs: 'diz "oi"' }])
  })
})
