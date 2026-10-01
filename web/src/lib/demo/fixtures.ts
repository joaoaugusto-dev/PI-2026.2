import type { DiaCalendario } from '@/hooks/useCalendario'
import type { Emprestimo } from '@/hooks/useEmprestimos'
import type { Ferramenta } from '@/hooks/useFerramentas'
import type { Colaborador, HistoricoFerramenta, Ocorrencia } from '@/hooks/useOcorrencias'

// Tudo aqui é FICTÍCIO e marcado como "Demo" no nome/código, para nunca ser confundido com dado real.
const DIA = 86_400_000
const pad = (n: number) => String(n).padStart(2, '0')

export const setores = [
  { id: 1, nome: 'Setor Demo A' },
  { id: 2, nome: 'Setor Demo B' },
  { id: 3, nome: 'Setor Demo C' },
]

export const categorias = [
  { id: 1, nome: 'Categoria Demo 1' },
  { id: 2, nome: 'Categoria Demo 2' },
  { id: 3, nome: 'Categoria Demo 3' },
]

const NOMES_FERRAMENTA = [
  'Ferramenta Demo A',
  'Ferramenta Demo B',
  'Ferramenta Demo C',
  'Ferramenta Demo D',
  'Ferramenta Demo E',
  'Ferramenta Demo F',
]
export const colaboradores: Colaborador[] = [
  { id: 1, nome: 'Colaborador Demo 1', matricula: 'DEMO-1', setor_id: 1 },
  { id: 2, nome: 'Colaborador Demo 2', matricula: 'DEMO-2', setor_id: 2 },
  { id: 3, nome: 'Colaborador Demo 3', matricula: 'DEMO-3', setor_id: 3 },
]

export const ferramentas: Ferramenta[] = Array.from({ length: 18 }, (_, i) => ({
  id: i + 1,
  nome: `${NOMES_FERRAMENTA[i % NOMES_FERRAMENTA.length]} ${Math.floor(i / NOMES_FERRAMENTA.length) + 1}`,
  descricao: null,
  marca: 'Marca Demo',
  modelo: null,
  codigo_identificacao: 999000 + i,
  grupo_id: (i % categorias.length) + 1,
  subgrupo_id: null,
  setor_id: (i % setores.length) + 1,
  localizacao: 'Local Demo',
  status: i % 6 === 0 ? 'indisponivel' : i % 3 === 0 ? 'em_uso' : 'disponivel',
  motivo_indisponivel: i % 6 === 0 ? 'Motivo de demonstração' : null,
  etiqueta_impressa_em: null,
  foto_url: null,
  ativo: true,
  created_at: new Date(Date.now() - 30 * DIA).toISOString(),
}))

export function historicoDe(ferramentaId: number): HistoricoFerramenta {
  const f = ferramentas.find((x) => x.id === ferramentaId)
  const ocorrencias: Ocorrencia[] =
    f?.status === 'indisponivel'
      ? [
          {
            id: ferramentaId,
            emprestimo_id: null,
            item_kit_id: null,
            colaborador_id: colaboradores[ferramentaId % colaboradores.length].id,
            tipo: ferramentaId % 2 ? 'perda' : 'avaria',
            descricao: 'Ocorrência fictícia, só para demonstração.',
            status: 'aberta',
            custo_estimado: '180.00',
            custo_real: null,
            data_resolucao: null,
            observacoes_resolucao: null,
            registrada_por: 1,
            resolvida_por: null,
            created_at: new Date(Date.now() - 2 * DIA).toISOString(),
            updated_at: new Date(Date.now() - 2 * DIA).toISOString(),
          },
        ]
      : []
  const doItem = emprestimos
    .filter((_, i) => i % ferramentas.length === ferramentaId - 1)
    .map((e) => ({
      ...e,
      ferramenta_nome: f?.nome ?? e.ferramenta_nome,
      codigo_identificacao: f?.codigo_identificacao ?? null,
    }))
  return { emprestimos: doItem, ocorrencias }
}

export const emprestimos: Emprestimo[] = Array.from({ length: 24 }, (_, i) => {
  const retirada = Date.now() - (i * 2 + 1) * DIA
  const devolvido = i % 3 !== 0
  const colab = colaboradores[i % colaboradores.length]
  const setor = setores[i % setores.length]
  return {
    id: 100 - i,
    ferramenta_nome: NOMES_FERRAMENTA[i % NOMES_FERRAMENTA.length],
    codigo_identificacao: 999000 + i,
    colaborador_nome: colab.nome,
    colaborador_matricula: colab.matricula,
    setor_id: setor.id,
    setor_nome: setor.nome,
    data_retirada: new Date(retirada).toISOString(),
    previsao_devolucao: new Date(retirada + 3 * DIA).toISOString(),
    data_devolucao: devolvido ? new Date(retirada + 2 * DIA).toISOString() : null,
    condicao_devolucao: devolvido ? (i % 7 === 0 ? 'avaria' : 'ok') : null,
    situacao: devolvido ? 'devolvido' : i % 2 ? 'atrasado' : 'em_aberto',
  }
})

/** Devoluções previstas de um mês (AAAA-MM), espalhadas pelos mesmos dias em qualquer mês. */
export function calendarioDoMes(mes: string): DiaCalendario[] {
  return [3, 5, 9, 12, 16, 19, 23, 24, 26, 27].map((dia, i) => ({
    dia: `${mes}-${pad(dia)}`,
    emprestimos: Array.from({ length: (i % 4) + 1 }, (_, j) => {
      const setor = setores[(i + j) % setores.length]
      return {
        id: i * 10 + j,
        ferramenta_nome: NOMES_FERRAMENTA[(i + j) % NOMES_FERRAMENTA.length],
        ferramenta_codigo: `SF${String(999000 + i * 10 + j)}`,
        colaborador_nome: colaboradores[(i + j) % colaboradores.length].nome,
        setor_id: setor.id,
        setor_nome: setor.nome,
        ramal: '0000',
      }
    }),
  }))
}

