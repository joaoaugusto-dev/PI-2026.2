import type { Cell, Sheet } from 'write-excel-file/browser'
import type { Cartao, Tabela } from '@/components/analises/catalogo'
import { dataBR, dataHoraBR } from '@/lib/formatar'
import type { Periodo } from '@/lib/periodo'

// mesma identidade do sistema: vermelho da marca no cabeçalho, tinta #1D1D1B, borda #D9D9D9
const VERMELHO = '#E30613'
const TINTA = '#1D1D1B'
const CINZA = '#575756'
const BORDA = '#D9D9D9'
const ZEBRA = '#F5F5F4'

const FORMATO: Record<Tabela['colunas'][number]['tipo'], string | undefined> = {
  texto: undefined,
  inteiro: '#,##0',
  percentual: '0.0%',
  decimal: '#,##0.00',
}

const titulo = (valor: string, colunas: number): Cell => ({ value: valor, fontWeight: 'bold', fontSize: 16, textColor: TINTA, columnSpan: colunas, height: 28, alignVertical: 'center' })
const nota = (valor: string, colunas: number): Cell => ({ value: valor, textColor: CINZA, columnSpan: colunas, wrap: true })
const cabecalho = (valor: string, alinhar: 'left' | 'right'): Cell => ({
  value: valor,
  fontWeight: 'bold',
  textColor: '#FFFFFF',
  backgroundColor: VERMELHO,
  align: alinhar,
  alignVertical: 'center',
  height: 22,
  borderStyle: 'thin',
  borderColor: VERMELHO,
})

function corpo(tabela: Tabela): Cell[][] {
  return tabela.linhas.map((linha, i) =>
    linha.map((valor, c) => ({
      value: valor,
      type: typeof valor === 'number' ? Number : String,
      format: FORMATO[tabela.colunas[c].tipo],
      backgroundColor: i % 2 ? ZEBRA : undefined,
      bottomBorderStyle: 'thin',
      bottomBorderColor: BORDA,
    })) as Cell[],
  )
}

// nome de aba: até 31 caracteres e sem : \ / ? * [ ]
const nomeDaAba = (nome: string) => nome.replace(/[:\\/?*[\]]/g, '').slice(0, 31)

/**
 * Planilha .xlsx do painel: aba "Resumo" com os números de destaque e uma aba por cartão com a tabela
 * inteira. Números vão como número (somáveis, com formato de milhar, % e decimal), cabeçalho congelado.
 * A biblioteca só é baixada no clique (import dinâmico), fora do bundle da tela.
 */
export async function baixarPlanilhaAnalises(itens: { cartao: Cartao<unknown>; dado: unknown }[], periodo: Periodo, autor: string) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const textoPeriodo = `${dataBR(periodo.de)} a ${dataBR(periodo.ate)}`
  const geradoEm = dataHoraBR(new Date().toISOString())

  const destaques = itens.flatMap(({ cartao, dado }) => (cartao.destaque ? [{ cartao, ...cartao.destaque(dado as never) }] : []))
  const resumo: Sheet<Blob> = {
    sheet: 'Resumo',
    showGridLines: false,
    columns: [{ width: 34 }, { width: 14 }, { width: 34 }, { width: 60 }],
    stickyRowsCount: 6,
    data: [
      [titulo('SOUFER Tools · Relatório de análises', 4)],
      [{ value: 'Período', fontWeight: 'bold' }, { value: textoPeriodo, columnSpan: 3 }],
      [{ value: 'Gerado em', fontWeight: 'bold' }, { value: geradoEm, columnSpan: 3 }],
      [{ value: 'Gerado por', fontWeight: 'bold' }, { value: autor, columnSpan: 3 }],
      [],
      [cabecalho('Indicador', 'left'), cabecalho('Valor', 'right'), cabecalho('Detalhe', 'left'), cabecalho('O que significa', 'left')],
      ...destaques.map((d, i) =>
        [
          { value: d.cartao.titulo, fontWeight: 'bold' },
          { value: d.valor, align: 'right', fontWeight: 'bold' },
          { value: d.detalhe },
          { value: d.cartao.descricao, textColor: CINZA, wrap: true },
        ].map((c) => ({ ...c, backgroundColor: i % 2 ? ZEBRA : undefined, bottomBorderStyle: 'thin', bottomBorderColor: BORDA })) as Cell[],
      ),
    ],
  }

  const abas = itens.flatMap(({ cartao, dado }): Sheet<Blob>[] => {
    if (!cartao.tabela) return []
    const tabela = cartao.tabela(dado as never)
    const n = tabela.colunas.length
    return [
      {
        sheet: nomeDaAba(cartao.titulo),
        showGridLines: false,
        columns: tabela.colunas.map((c) => ({ width: c.largura })),
        stickyRowsCount: 5,
        data: [
          [titulo(cartao.titulo, n)],
          [nota(cartao.descricao, n)],
          [nota(`Período: ${textoPeriodo}`, n)],
          [],
          tabela.colunas.map((c) => cabecalho(c.titulo, c.tipo === 'texto' ? 'left' : 'right')),
          ...(tabela.linhas.length ? corpo(tabela) : [[nota('Nenhum registro no período.', n)]]),
        ],
      },
    ]
  })

  // nomes de aba repetidos (dois títulos iguais depois de cortar em 31) quebram o arquivo
  const usados = new Set<string>()
  for (const aba of [resumo, ...abas]) {
    let nome = aba.sheet!
    for (let k = 2; usados.has(nome); k++) nome = `${aba.sheet!.slice(0, 28)} ${k}`
    usados.add(nome)
    aba.sheet = nome
  }

  await writeXlsxFile([resumo, ...abas]).toFile(`analises-soufer-${periodo.de}-a-${periodo.ate}.xlsx`)
}
