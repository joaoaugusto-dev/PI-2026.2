import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Status } from '@/components/StatusBadge'

export type StatusFerramenta = 'disponivel' | 'em_uso' | 'indisponivel'

export interface Ferramenta {
  id: number
  nome: string
  descricao: string | null
  marca: string | null
  modelo: string | null
  codigo_identificacao: number | null
  grupo_id: number
  subgrupo_id: number | null
  setor_id: number | null
  localizacao: string | null
  status: StatusFerramenta
  motivo_indisponivel: string | null
  etiqueta_impressa_em: string | null
  foto_url: string | null
  ativo: boolean
  created_at: string
}

export interface FiltrosFerramentas {
  page?: number
  limit?: number
  q?: string
  status?: StatusFerramenta
  grupoId?: number
}

interface ListaFerramentasResponse {
  data: Ferramenta[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

/** Payload de `POST /v1/ferramentas` (`criarFerramentaSchema` da API) — campos gerados no servidor (id, código de patrimônio, status) ficam de fora. */
export interface NovaFerramenta {
  nome: string
  descricao?: string
  marca?: string
  modelo?: string
  grupoId: number
  setorId?: number
  localizacao?: string
}

/** `disponivel`/`em_uso`/`indisponivel` do banco -> variante do StatusBadge (FE-01). */
export function statusParaBadge(status: StatusFerramenta): Status {
  return status === 'em_uso' ? 'em-uso' : status
}

/** Código de patrimônio (regra 7, em revisão): `SF` + 6 dígitos do id de identificação. */
export function formatarPatrimonio(codigo: number | null) {
  return codigo ? `SF${String(codigo).padStart(6, '0')}` : '—'
}

export function useFerramentas(filtros: FiltrosFerramentas) {
  return useQuery({
    queryKey: ['ferramentas', filtros],
    queryFn: async () => {
      const { data } = await api.get<ListaFerramentasResponse>('/ferramentas', { params: filtros })
      return data
    },
    placeholderData: (dadoAnterior) => dadoAnterior,
    retry: 1,
  })
}

export function useCriarFerramenta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (dados: NovaFerramenta) => {
      const { data } = await api.post<{ data: Ferramenta }>('/ferramentas', dados)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferramentas'] })
    },
  })
}

export function useFerramenta(id: number) {
  return useQuery({
    queryKey: ['ferramentas', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Ferramenta }>(`/ferramentas/${id}`)
      return data.data
    },
    // ferramenta inexistente (404) é resposta definitiva: mostra o 404 na hora, sem esperar os retries
    retry: (tentativas, erro) =>
      (erro as { response?: { status?: number } }).response?.status !== 404 && tentativas < 3,
  })
}

/** `PATCH /ferramentas/:id/etiqueta-impressa`: grava data/hora da impressão da etiqueta de código de barras. */
export function useMarcarEtiquetaImpressa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch<{ data: Ferramenta }>(`/ferramentas/${id}/etiqueta-impressa`)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferramentas'] })
    },
  })
}
