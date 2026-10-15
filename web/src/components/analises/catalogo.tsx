import type { ReactNode } from 'react'
import { BarrasRanking, type ItemRanking, type TomBarra } from '@/components/analises/BarrasRanking'
import { EmprestimosAbertos as ConteudoAbertos } from '@/components/analises/EmprestimosAbertos'
import { GraficoEvolucao } from '@/components/analises/GraficoEvolucao'
import { NumeroPeriodo } from '@/components/analises/NumeroPeriodo'
import { ParqueIndisponivel } from '@/components/analises/ParqueIndisponivel'
import { METRICAS, MOTIVO } from '@/components/analises/rotulos'
import { formatarPatrimonio } from '@/hooks/useFerramentas'
import type {
  ConsultaKpi,
  EmprestimosAbertos,
  Evolucao,
  IndisponiveisAgora,
  ItemCategoria,
  ItemColaborador,
  ItemFerramenta,
  ItemSetor,
  ItemTaxaAvaria,
  ItemTempoPosse,
  Itens,
  Metrica,
  OcorrenciasPorCategoria,
} from '@/hooks/useKpis'
import { dataBR } from '@/lib/formatar'
import { duracaoBR, inteiroBR, percentualBR } from '@/lib/numeros'
import { granularidadeDoPeriodo, type Periodo } from '@/lib/periodo'

/** Tabela de um cartão: alimenta o relatório A4 e a planilha. `barra` desenha a barra dessa coluna no papel. */
export interface Tabela {
  colunas: { titulo: string; tipo: 'texto' | 'inteiro' | 'percentual' | 'decimal'; largura: number; barra?: boolean }[]
  linhas: (string | number)[][]
}

/** Número de destaque: vira caixa no topo do relatório e linha da aba "Resumo" da planilha. */
export interface Destaque {
  valor: string
  detalhe: string
}

export interface Cartao<T = never> {
  id: string
  titulo: string
  /** O que o número quer dizer, em uma frase: aparece no cartão, no relatório e na planilha. */
  descricao: string
  soAdmin?: boolean
  /** Largura ÷ altura ideal no tamanho médio (o layout justificado parte dela). */
  proporcao: number
  larguraMin: number
  alturaMin: number
  consulta: (p: Periodo) => ConsultaKpi
  Conteudo: (props: { dado: T; altura: number }) => ReactNode
  /** Versão do gráfico para o papel (largura fixa em px, sem animação); aparece antes da tabela no relatório. */
  Impresso?: (props: { dado: T; largura: number }) => ReactNode
  destaque?: (dado: T) => Destaque
  tabela?: (dado: T) => Tabela
}

// limite dos rankings: o cartão mostra o que couber, o relatório e a planilha levam os 10
const LIMITE = 10

const periodo = (rota: string, extra: Record<string, string | number> = {}) => (p: Periodo) => ({
  rota,
  params: { de: p.de, ate: p.ate, ...extra },
})

const evolucao = (p: Periodo) => periodo('evolucao', { granularidade: granularidadeDoPeriodo(p) })(p)

function numeroDoPeriodo(metrica: Metrica, descricao: string) {
  const rotulo = METRICAS.find((m) => m.chave === metrica)!.rotulo
  return definir<Evolucao>({
    id: metrica,
    titulo: rotulo,
    descricao,
    proporcao: 1.35,
    larguraMin: 220,
    alturaMin: 170,
    consulta: evolucao,
    Conteudo: ({ dado, altura }) => <NumeroPeriodo dado={dado} metrica={metrica} altura={altura} />,
    destaque: (d) => {
      const v = d.variacao_percentual[metrica]
      return {
        valor: inteiroBR(d.totais.atual[metrica]),
        detalhe: v === null ? 'sem base no período anterior' : `${v > 0 ? '+' : ''}${percentualBR(v)} vs período anterior`,
      }
    },
  })
}

function ranking<I>(
  base: Omit<Cartao<Itens<I>>, 'Conteudo' | 'tabela' | 'proporcao' | 'larguraMin' | 'alturaMin'>,
  itens: (i: I) => Omit<ItemRanking, 'rotulo'> & { rotulo?: string },
  colunas: Tabela['colunas'],
  linha: (i: I) => (string | number)[],
  tom?: TomBarra,
): Cartao<unknown> {
  const paraRanking = (i: I): ItemRanking => {
    const r = itens(i)
    return { ...r, rotulo: r.rotulo ?? inteiroBR(r.valor) }
  }
  return definir<Itens<I>>({
    ...base,
    proporcao: 1.15,
    larguraMin: 280,
    alturaMin: 260,
    Conteudo: ({ dado }) => <BarrasRanking itens={dado.itens.map(paraRanking)} tom={tom} />,
    tabela: (d) => ({ colunas, linhas: d.itens.map(linha) }),
  })
}

const RETIRADAS = { titulo: 'Retiradas', tipo: 'inteiro', largura: 12, barra: true } as const

function porCategoria(id: string, titulo: string, rota: string, descricao: string) {
  return definir<OcorrenciasPorCategoria>({
    id,
    titulo,
    descricao,
    proporcao: 1.15,
    larguraMin: 280,
    alturaMin: 260,
    consulta: periodo(rota),
    Conteudo: ({ dado }) => (
      <BarrasRanking
        tom="problema"
        itens={dado.itens.map((i) => ({ chave: i.categoria_id, nome: i.categoria_nome, valor: i.total, rotulo: inteiroBR(i.total) }))}
      />
    ),
    destaque: (d) => ({ valor: inteiroBR(d.total), detalhe: `em ${d.itens.length} ${d.itens.length === 1 ? 'categoria' : 'categorias'}` }),
    tabela: (d) => ({
      colunas: [
        { titulo: 'Categoria', tipo: 'texto', largura: 34 },
        { titulo: 'Ocorrências', tipo: 'inteiro', largura: 14, barra: true },
      ],
      linhas: d.itens.map((i) => [i.categoria_nome, i.total]),
    }),
  })
}

// guarda a tipagem de cada cartão (consulta, Conteudo e tabela do mesmo T) antes de entrar na lista mista
const definir = <T,>(cartao: Cartao<T>) => cartao as Cartao<unknown>

/** Todos os cartões possíveis, na ordem padrão do painel. */
export const CARTOES: Cartao<unknown>[] = [
  numeroDoPeriodo('retiradas', 'Ferramentas que saíram no período.'),
  numeroDoPeriodo('devolucoes', 'Ferramentas que voltaram no período.'),
  numeroDoPeriodo('ocorrencias', 'Avarias e extravios registrados na devolução.'),
  definir<Evolucao>({
    id: 'evolucao',
    titulo: 'Movimento ao longo do tempo',
    descricao: 'Retiradas, devoluções e ocorrências na mesma escala, para comparar uma com a outra.',
    proporcao: 2.4,
    larguraMin: 420,
    alturaMin: 300,
    consulta: evolucao,
    Conteudo: ({ dado, altura }) => <GraficoEvolucao dado={dado} altura={altura} />,
    Impresso: ({ dado, largura }) => <GraficoEvolucao dado={dado} altura={3 * 64 + 24} largura={largura} />,
    tabela: (d: Evolucao) => ({
      colunas: [
        { titulo: d.granularidade === 'dia' ? 'Dia' : d.granularidade === 'semana' ? 'Semana de' : 'Mês de', tipo: 'texto', largura: 14 },
        ...METRICAS.map((m) => ({ titulo: m.rotulo, tipo: 'inteiro' as const, largura: 13 })),
      ],
      linhas: d.serie.map((b) => [dataBR(b.inicio), b.retiradas, b.devolucoes, b.ocorrencias]),
    }),
  }),
  ranking<ItemFerramenta>(
    { id: 'ferramentas', titulo: 'Ferramentas mais retiradas', descricao: 'As que mais saíram no período.', consulta: periodo('ferramentas-mais-retiradas', { limit: LIMITE }) },
    (i) => ({ chave: i.ferramenta_id, nome: i.ferramenta_nome, detalhe: formatarPatrimonio(i.codigo_identificacao), valor: i.total_retiradas }),
    [
      { titulo: 'Código', tipo: 'texto', largura: 10 },
      { titulo: 'Ferramenta', tipo: 'texto', largura: 40 },
      { titulo: 'Categoria', tipo: 'texto', largura: 22 },
      RETIRADAS,
    ],
    (i) => [formatarPatrimonio(i.codigo_identificacao), i.ferramenta_nome, i.categoria_nome, i.total_retiradas],
  ),
  ranking<ItemCategoria>(
    { id: 'categorias', titulo: 'Categorias mais usadas', descricao: 'Retiradas somadas por categoria.', consulta: periodo('categorias-mais-utilizadas', { limit: LIMITE }) },
    (i) => ({ chave: i.categoria_id, nome: i.categoria_nome, valor: i.total_retiradas }),
    [{ titulo: 'Categoria', tipo: 'texto', largura: 34 }, RETIRADAS],
    (i) => [i.categoria_nome, i.total_retiradas],
  ),
  ranking<ItemSetor>(
    { id: 'setores', titulo: 'Setores que mais retiram', descricao: 'Pelo setor para onde a ferramenta foi.', consulta: periodo('setores-que-mais-retiram', { limit: LIMITE }) },
    (i) => ({ chave: i.setor_id, nome: i.setor_nome, valor: i.total_retiradas }),
    [{ titulo: 'Setor', tipo: 'texto', largura: 34 }, RETIRADAS],
    (i) => [i.setor_nome, i.total_retiradas],
  ),
  ranking<ItemColaborador>(
    {
      id: 'colaboradores',
      titulo: 'Colaboradores que mais retiram',
      descricao: 'Quem mais retirou no período. Só o administrador vê.',
      soAdmin: true,
      consulta: periodo('colaboradores-que-mais-retiram', { limit: LIMITE }),
    },
    (i) => ({ chave: i.colaborador_id, nome: i.colaborador_nome, detalhe: i.setor_nome, valor: i.total_retiradas }),
    [
      { titulo: 'Matrícula', tipo: 'texto', largura: 11 },
      { titulo: 'Colaborador', tipo: 'texto', largura: 36 },
      { titulo: 'Setor', tipo: 'texto', largura: 22 },
      RETIRADAS,
    ],
    (i) => [i.matricula, i.colaborador_nome, i.setor_nome, i.total_retiradas],
  ),
  definir<EmprestimosAbertos>({
    id: 'abertos',
    titulo: 'Em uso agora',
    descricao: 'Retrato de agora, não depende do período.',
    proporcao: 1.2,
    larguraMin: 280,
    alturaMin: 260,
    consulta: () => ({ rota: 'emprestimos-abertos', params: { limit: LIMITE } }),
    Conteudo: ({ dado }) => <ConteudoAbertos dado={dado} />,
    destaque: (d: EmprestimosAbertos) => ({ valor: inteiroBR(d.total), detalhe: `${inteiroBR(d.atrasados)} ${d.atrasados === 1 ? 'atrasada' : 'atrasadas'}` }),
    tabela: (d: EmprestimosAbertos) => ({
      colunas: [
        { titulo: 'Código', tipo: 'texto', largura: 10 },
        { titulo: 'Ferramenta', tipo: 'texto', largura: 40 },
        { titulo: 'Retirada em', tipo: 'texto', largura: 13 },
        { titulo: 'Previsão', tipo: 'texto', largura: 13 },
        { titulo: 'Dias fora', tipo: 'inteiro', largura: 11, barra: true },
      ],
      linhas: d.mais_antigos.map((e) => [formatarPatrimonio(e.codigo_identificacao), e.ferramenta_nome, dataBR(e.data_retirada), dataBR(e.previsao_devolucao), e.dias_aberto]),
    }),
  }),
  definir<IndisponiveisAgora>({
    id: 'indisponiveis',
    titulo: 'Parque indisponível',
    descricao: 'Retrato de agora, não depende do período.',
    proporcao: 1.2,
    larguraMin: 260,
    alturaMin: 240,
    consulta: () => ({ rota: 'indisponiveis', params: {} }),
    Conteudo: ({ dado }) => <ParqueIndisponivel dado={dado} />,
    destaque: (d: IndisponiveisAgora) => ({
      valor: percentualBR(d.percentual_do_parque),
      detalhe: `${inteiroBR(d.total_indisponiveis)} de ${inteiroBR(d.total_cadastradas)} paradas`,
    }),
    tabela: (d: IndisponiveisAgora) => ({
      colunas: [
        { titulo: 'Motivo', tipo: 'texto', largura: 30 },
        { titulo: 'Ferramentas', tipo: 'inteiro', largura: 14, barra: true },
      ],
      linhas: d.por_motivo.map((m) => [MOTIVO[m.motivo] ?? m.motivo, m.total]),
    }),
  }),
  ranking<ItemTaxaAvaria>(
    {
      id: 'taxa_avaria',
      titulo: 'Taxa de avaria',
      descricao: 'De cada 100 devoluções da categoria, quantas voltaram avariadas.',
      consulta: periodo('taxa-avaria', { agrupar: 'categoria', limit: LIMITE }),
    },
    (i) => ({ chave: i.categoria_nome, nome: i.categoria_nome, detalhe: `${i.total_avarias} de ${i.total_devolucoes}`, valor: i.percentual, rotulo: percentualBR(i.percentual) }),
    [
      { titulo: 'Categoria', tipo: 'texto', largura: 30 },
      { titulo: 'Devoluções', tipo: 'inteiro', largura: 12 },
      { titulo: 'Avarias', tipo: 'inteiro', largura: 10 },
      { titulo: 'Taxa', tipo: 'percentual', largura: 10, barra: true },
    ],
    // a planilha recebe a fração (0,25) com formato de percentual; o papel mostra o texto "25%"
    (i) => [i.categoria_nome, i.total_devolucoes, i.total_avarias, i.percentual / 100],
    'problema',
  ),
  porCategoria('avarias', 'Avarias por categoria', 'avarias-por-categoria', 'Ocorrências de avaria abertas no período.'),
  porCategoria('extravios', 'Extravios por categoria', 'extravios-por-categoria', 'Ferramentas que não voltaram, por categoria.'),
  ranking<ItemTempoPosse>(
    {
      id: 'tempo_posse',
      titulo: 'Tempo médio fora',
      descricao: 'Da retirada à devolução, por categoria (só o que já voltou).',
      consulta: periodo('tempo-medio-posse', { agrupar: 'categoria', limit: LIMITE }),
    },
    (i) => ({ chave: i.categoria_nome, nome: i.categoria_nome, detalhe: `${i.total_devolucoes} ${i.total_devolucoes === 1 ? 'devolução' : 'devoluções'}`, valor: i.horas_medias, rotulo: duracaoBR(i.horas_medias) }),
    [
      { titulo: 'Categoria', tipo: 'texto', largura: 30 },
      { titulo: 'Devoluções', tipo: 'inteiro', largura: 12 },
      { titulo: 'Horas (média)', tipo: 'decimal', largura: 14 },
      { titulo: 'Dias (média)', tipo: 'decimal', largura: 13, barra: true },
    ],
    (i) => [i.categoria_nome, i.total_devolucoes, i.horas_medias, i.dias_medios],
  ),
]
