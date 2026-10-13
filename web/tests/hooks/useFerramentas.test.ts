import { describe, expect, it } from 'vitest'
import { chaveFerramenta } from '@/hooks/useFerramentas'

describe('chaveFerramenta', () => {
  it('ignora caixa e espaços e trata marca/modelo ausentes como vazios', () => {
    expect(chaveFerramenta(' Furadeira ', 'BOSCH', null)).toBe(chaveFerramenta('furadeira', 'bosch', ''))
    expect(chaveFerramenta('Furadeira', 'Bosch', 'GSB 13')).not.toBe(chaveFerramenta('Furadeira', 'Bosch', 'GSB 20'))
  })
})
