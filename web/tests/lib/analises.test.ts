import { describe, expect, it } from 'vitest'
import { CARTOES } from '@/components/analises/catalogo'
import { lerPreferencias } from '@/hooks/usePreferenciasAnalises'
import { montarLinhas, type Peca } from '@/lib/layout-justificado'
import { diasNoPeriodo, erroDoPeriodo, granularidadeDoPeriodo, periodoDoAtalho } from '@/lib/periodo'

const peca = (id: string, proporcao = 1.5, larguraMin = 200, alturaMin = 150): Peca => ({ id, proporcao, larguraMin, alturaMin })
const area = { largura: 1200, alturaAlvo: 300, alturaMax: 420, espaco: 12 }

describe('montarLinhas (layout justificado)', () => {
  it('mantém a ordem e cada linha preenche a largura', () => {
    const pecas = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => peca(id))
    const linhas = montarLinhas(pecas, area)
    expect(linhas.flatMap((l) => l.pecas.map((p) => p.id))).toEqual(pecas.map((p) => p.id))
    for (const l of linhas) {
      const ocupado = l.pecas.reduce((s, p) => s + p.largura, 0) + area.espaco * (l.pecas.length - 1)
      expect(area.largura - ocupado).toBeLessThan(l.pecas.length) // só o arredondamento para baixo
    }
  })

  it('largura menor (sidebar aberta, celular) quebra em mais linhas', () => {
    const pecas = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => peca(id))
    const larga = montarLinhas(pecas, area).length
    const estreita = montarLinhas(pecas, { ...area, largura: 900 }).length
    const celular = montarLinhas(pecas, { ...area, largura: 330 })
    expect(estreita).toBeGreaterThanOrEqual(larga)
    expect(celular).toHaveLength(6) // 330px não comporta duas de 200px
  })

  it('nenhuma peça fica abaixo da largura mínima quando divide a linha', () => {
    const pecas = [peca('grafico', 2.6, 520), peca('a'), peca('b'), peca('c'), peca('d')]
    for (const largura of [360, 768, 1024, 1280, 1600, 2400]) {
      for (const l of montarLinhas(pecas, { ...area, largura })) {
        if (l.pecas.length === 1) continue
        for (const p of l.pecas) expect(p.largura).toBeGreaterThanOrEqual(pecas.find((x) => x.id === p.id)!.larguraMin - 1)
      }
    }
  })

  it('altura respeita o teto e o mínimo da peça', () => {
    const [sozinha] = montarLinhas([peca('a', 1)], area) // 1200 de largura daria 1200 de altura
    expect(sozinha.altura).toBe(area.alturaMax)
    const [baixa] = montarLinhas([peca('a', 6, 200, 260)], { ...area, largura: 600 }) // 600 / 6 = 100
    expect(baixa.altura).toBe(260)
  })

  it('sem peça ou sem largura não monta nada', () => {
    expect(montarLinhas([], area)).toEqual([])
    expect(montarLinhas([peca('a')], { ...area, largura: 0 })).toEqual([])
  })
})

describe('período dos KPIs', () => {
  // 14/10/2026 15:00 em Brasília
  const agora = new Date('2026-10-14T18:00:00Z')

  it('atalhos terminam hoje em Brasília', () => {
    expect(periodoDoAtalho('7d', agora)).toEqual({ de: '2026-10-08', ate: '2026-10-14' })
    expect(periodoDoAtalho('mes', agora)).toEqual({ de: '2026-10-01', ate: '2026-10-14' })
    expect(periodoDoAtalho('mes_anterior', agora)).toEqual({ de: '2026-09-01', ate: '2026-09-30' })
    expect(periodoDoAtalho('trimestre', agora)).toEqual({ de: '2026-10-01', ate: '2026-10-14' })
    expect(diasNoPeriodo(periodoDoAtalho('30d', agora))).toBe(30)
    expect(diasNoPeriodo(periodoDoAtalho('12m', agora))).toBe(365)
  })

  it('23h de 31/12 em Brasília ainda é dezembro (já é janeiro em UTC)', () => {
    expect(periodoDoAtalho('mes', new Date('2027-01-01T02:00:00Z'))).toEqual({ de: '2026-12-01', ate: '2026-12-31' })
    expect(periodoDoAtalho('mes_anterior', new Date('2027-01-15T12:00:00Z'))).toEqual({ de: '2026-12-01', ate: '2026-12-31' })
  })

  it('valida o período como a API', () => {
    expect(erroDoPeriodo({ de: '2026-10-01', ate: '2026-10-01' })).toBeNull()
    expect(erroDoPeriodo({ de: '', ate: '2026-10-01' })).toMatch(/duas datas/)
    expect(erroDoPeriodo({ de: '2026-10-02', ate: '2026-10-01' })).toMatch(/depois/)
    expect(erroDoPeriodo({ de: '2025-01-01', ate: '2026-01-02' })).toMatch(/366/) // 367 dias
    expect(erroDoPeriodo({ de: '2024-01-01', ate: '2024-12-31' })).toBeNull() // bissexto: 366
  })

  it('escolhe o balde do gráfico pelo tamanho do período', () => {
    expect(granularidadeDoPeriodo({ de: '2026-10-01', ate: '2026-10-31' })).toBe('dia')
    expect(granularidadeDoPeriodo({ de: '2026-07-01', ate: '2026-09-30' })).toBe('semana')
    expect(granularidadeDoPeriodo({ de: '2026-01-01', ate: '2026-12-31' })).toBe('mes')
  })
})

describe('lerPreferencias (localStorage do painel)', () => {
  const ids = ['retiradas', 'evolucao', 'setores']

  it('sem nada salvo, JSON quebrado ou formato errado volta ao padrão', () => {
    for (const texto of [null, '{quebrado', '[]', '"x"', '42']) {
      const p = lerPreferencias(texto, ids)
      expect(p.ordem).toEqual(ids)
      expect(p.atalho).toBe('30d')
      expect(p.ocultos).toEqual([])
    }
  })

  it('atalho, tamanho e período inválidos caem no padrão sem derrubar a tela', () => {
    const p = lerPreferencias(
      JSON.stringify({ atalho: 'semestre', tamanhos: { retiradas: 'GG', evolucao: 'G', fantasma: 'P' }, personalizado: { de: 1 } }),
      ids,
    )
    expect(p.atalho).toBe('30d')
    expect(p.tamanhos).toEqual({ evolucao: 'G' })
    expect(typeof p.personalizado.de).toBe('string')
  })

  it('cartão novo entra no fim, removido sai e repetido não duplica', () => {
    const p = lerPreferencias(JSON.stringify({ ordem: ['setores', 'velho', 'setores', 'retiradas'], ocultos: ['velho', 'evolucao'], atalho: 'mes' }), ids)
    expect(p.ordem).toEqual(['setores', 'retiradas', 'evolucao'])
    expect(p.ocultos).toEqual(['evolucao'])
    expect(p.atalho).toBe('mes')
  })
})

describe('catálogo → planilha', () => {
  it('taxa de avaria vai como fração (o formato 0.0% da planilha multiplica por 100)', () => {
    const taxa = CARTOES.find((c) => c.id === 'taxa_avaria')!
    const t = taxa.tabela!({ itens: [{ categoria_nome: 'Chaves', total_devolucoes: 8, total_avarias: 1, percentual: 12.5 }] })
    expect(t.colunas.at(-1)?.tipo).toBe('percentual')
    expect(t.linhas[0]).toEqual(['Chaves', 8, 1, 0.125])
  })
})
