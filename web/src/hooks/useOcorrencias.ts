import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Ferramenta } from '@/hooks/useFerramentas'

export type StatusOcorrencia = 'aberta' | 'em_reparo' | 'cobrada' | 'resolvida' | 'baixada'

export interface Ocorrencia {
  id: number
  emprestimo_id: number | null
  item_kit_id: number | null
  colaborador_id: number | null
  tipo: string
  descricao: string
  status: StatusOcorrencia
  custo_estimado: string | null
  custo_real: string | null
  data_resolucao: string | null
  observacoes_resolucao: string | null
  registrada_por: number
  resolvida_por: number | null
  created_at: string
  updated_at: string
}

interface HistoricoFerramenta {
  emprestimos: unknown[]
  ocorrencias: Ocorrencia[]
}

export interface Colaborador {
  id: number
  nome: string
  matricula: string
  setor_id: number | null
}

/**
 * ponytail: não existe `GET /v1/ocorrencias` (listagem geral) na API — só
 * `GET /ferramentas/:id/historico` por ferramenta individual. Pra montar a
 * tela de Indisponíveis buscamos o histórico de cada ferramenta em paralelo
 * (N+1, aceitável pro volume atual de dezenas de itens). Trocar por um
 * endpoint agregado se o back ganhar `GET /v1/ocorrencias?status=`.
 */
function historicoQueryOptions(ferramentaId: number) {
  return {
    queryKey: ['ferramentas', ferramentaId, 'historico'] as const,
    queryFn: async () => {
      const { data } = await api.get<{ data: HistoricoFerramenta }>(`/ferramentas/${ferramentaId}/historico`)
      return data.data
    },
  }
}

export function useHistoricoFerramenta(ferramentaId: number) {
  return useQuery(historicoQueryOptions(ferramentaId))
}

export function useHistoricosFerramentas(ferramentaIds: number[]) {
  return useQueries({ queries: ferramentaIds.map(historicoQueryOptions) })
}

function colaboradorQueryOptions(id: number) {
  return {
    queryKey: ['colaboradores', id] as const,
    queryFn: async () => {
      const { data } = await api.get<{ data: Colaborador }>(`/colaboradores/${id}`)
      return data.data
    },
  }
}

export function useColaboradores(ids: number[]) {
  return useQueries({ queries: ids.map(colaboradorQueryOptions) })
}

/**
 * A ocorrência relevante para exibir na tela é a mais recente ainda aberta
 * (aberta/em_reparo/cobrada) — enquanto a ferramenta está `indisponivel` não
 * deveria sobrar ocorrência `resolvida`/`baixada` sem tratativa (ver
 * `PATCH /ferramentas/:id/disponibilizar`, que resolve todas de uma vez e
 * libera a ferramenta), mas caímos pra mais recente de qualquer status como
 * fallback defensivo.
 */
export function ocorrenciaAtiva(ocorrencias: Ocorrencia[]) {
  return ocorrencias.find((o) => o.status === 'aberta' || o.status === 'em_reparo' || o.status === 'cobrada') ?? ocorrencias[0]
}

/**
 * `PATCH /ferramentas/:id/disponibilizar`: único endpoint real hoje pra
 * "resolver" uma indisponibilidade — resolve TODAS as ocorrências abertas da
 * ferramenta de uma vez e volta o status pra `disponivel`. Não existe rota
 * pra avançar uma etapa (aberta -> em_reparo -> cobrada) de uma ocorrência
 * específica.
 */
export function useDisponibilizarFerramenta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ferramentaId: number) => {
      const { data } = await api.patch<{ data: Ferramenta }>(`/ferramentas/${ferramentaId}/disponibilizar`)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferramentas'] })
    },
  })
}
