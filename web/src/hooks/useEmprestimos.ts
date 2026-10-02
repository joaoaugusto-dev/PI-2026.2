import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type SituacaoEmprestimo = 'em_aberto' | 'atrasado' | 'devolvido'

/** Linha de `GET /v1/emprestimos` (vw_emprestimos_detalhe). */
export interface Emprestimo {
  id: number
  ferramenta_id?: number
  atividade_nome?: string | null
  usuario_retirada_nome?: string
  ferramenta_nome: string
  codigo_identificacao: number | null
  /** false quando a ferramenta foi baixada: o código pode já ter sido reaproveitado por outra. */
  ferramenta_ativa: boolean
  colaborador_nome: string
  colaborador_matricula: string
  setor_id: number
  setor_nome: string
  data_retirada: string // ISO
  previsao_devolucao: string // ISO
  data_devolucao: string | null
  condicao_devolucao: 'ok' | 'avaria' | 'perda' | null
  situacao: SituacaoEmprestimo
}

export interface FiltrosEmprestimos {
  page?: number
  limit?: number
  q?: string
  situacao?: SituacaoEmprestimo
  setorId?: number
}

export interface ListaEmprestimos {
  data: Emprestimo[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export async function buscarEmprestimos(filtros: FiltrosEmprestimos, signal?: AbortSignal) {
  const { data } = await api.get<ListaEmprestimos>('/emprestimos', { params: filtros, signal })
  return data
}

export function useEmprestimos(filtros: FiltrosEmprestimos) {
  return useQuery({
    queryKey: ['emprestimos', filtros],
    queryFn: () => buscarEmprestimos(filtros),
    placeholderData: (anterior) => anterior,
  })
}
