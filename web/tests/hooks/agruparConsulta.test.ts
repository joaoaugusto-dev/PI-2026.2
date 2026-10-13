import { describe, expect, it } from 'vitest'
import { agruparPorNome, type FerramentaConsulta } from '@/hooks/useConsulta'

const f = (id: number, nome: string, status: FerramentaConsulta['status'], categoria = 'Chaves'): FerramentaConsulta => ({
  id,
  nome,
  categoria,
  status,
  localizacao: null,
  codigo_identificacao: id,
})

describe('agruparPorNome', () => {
  it('junta unidades vizinhas de mesmo nome e conta as disponíveis', () => {
    const grupos = agruparPorNome([
      f(1, 'Chave Allen 10 mm', 'disponivel'),
      f(2, 'Chave Allen 10 mm', 'em_uso'),
      f(3, 'Chave Allen 10 mm', 'disponivel'),
      f(4, 'Chave Allen 12 mm', 'indisponivel'),
    ])
    expect(grupos.map((g) => [g.nome, g.itens.length, g.disponiveis])).toEqual([
      ['Chave Allen 10 mm', 3, 2],
      ['Chave Allen 12 mm', 1, 0],
    ])
  })

  it('mesmo nome em categoria diferente não vira o mesmo grupo', () => {
    expect(agruparPorNome([f(1, 'Trena', 'disponivel', 'A'), f(2, 'Trena', 'disponivel', 'B')])).toHaveLength(2)
  })
})
