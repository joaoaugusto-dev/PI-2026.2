import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Emprestimo } from '@/hooks/useEmprestimos'
import type { Ferramenta } from '@/hooks/useFerramentas'
import { api } from '@/lib/api'
import { escolherPorCodigo, parseCodigoPatrimonio, type Escolha } from '@/lib/patrimonio'

export interface ColaboradorIdentificado {
  id: number
  nome: string
  matricula: string
  setor_id: number | null
}

/**
 * Ferramenta achada por código de patrimônio ou nome (`GET /ferramentas?q=`, que
 * já ignora zeros à esquerda). Com vários resultados, vale o de código igual ao digitado; sem ele,
 * nenhum é escolhido (`ambiguos` traz as opções). Código numérico vai direto em `/por-codigo`: a listagem
 * ordena por nome, então o de código exato poderia ficar fora da página.
 */
export function useFerramentaPorTermo(termo: string) {
  return useQuery({
    queryKey: ['ferramentas', 'por-termo', termo],
    enabled: termo.length > 0,
    queryFn: async ({ signal }): Promise<Escolha<Ferramenta>> => {
      const codigo = parseCodigoPatrimonio(termo)
      if (codigo) {
        try {
          const { data } = await api.get<{ data: Ferramenta }>(`/ferramentas/por-codigo/${codigo}`, { signal })
          return { item: data.data, ambiguos: [] }
        } catch (e) {
          const status = (e as { response?: { status?: number } }).response?.status
          if (status !== 404 && status !== 400) throw e // sem esse código: pode ser um nome numérico, cai na busca
        }
      }
      const { data } = await api.get<{ data: Ferramenta[] }>('/ferramentas', { params: { q: termo, limit: 10 }, signal })
      return escolherPorCodigo(data.data, termo, (f) => f.codigo_identificacao)
    },
  })
}

/**
 * `GET /colaboradores/identificar`: matrícula/crachá ou nome. 404 (não achou) vira `item: null` para abrir o
 * cadastro rápido; 409 `COLABORADOR_AMBIGUO` (vários nomes) traz os candidatos em `ambiguos`, para pedir a matrícula.
 */
export function useColaboradorPorTermo(termo: string) {
  return useQuery({
    queryKey: ['colaboradores', 'identificar', termo],
    enabled: termo.length > 0,
    retry: false,
    queryFn: async ({ signal }): Promise<Escolha<ColaboradorIdentificado>> => {
      try {
        const { data } = await api.get<{ data: ColaboradorIdentificado }>('/colaboradores/identificar', {
          params: { termo },
          signal,
        })
        return { item: data.data, ambiguos: [] }
      } catch (e) {
        const r = (e as { response?: { status?: number; data?: { error?: { code?: string; details?: ColaboradorIdentificado[] } } } }).response
        if (r?.status === 404) return { item: null, ambiguos: [] }
        if (r?.data?.error?.code === 'COLABORADOR_AMBIGUO') return { item: null, ambiguos: r.data.error.details ?? [] }
        throw e
      }
    },
  })
}

/** `POST /colaboradores`: cadastro rápido no meio da retirada (Regra 5). */
export function useCadastrarColaboradorRapido() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (dados: { nome: string; matricula: string; setorId: number }) => {
      const { data } = await api.post<{ data: ColaboradorIdentificado }>('/colaboradores', dados)
      return data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['colaboradores'] }),
  })
}

export interface NovaRetirada {
  ferramentaId: number
  colaboradorId: number
  setorDestinoId: number
  /** `YYYY-MM-DD`: vale até 23:59:59 daquele dia (Brasília). */
  previsaoDevolucao: string
  atividadeObservacao?: string
}

/** `POST /emprestimos`: a ferramenta vai para `em_uso`; quem registra é o usuário do JWT (Regra 6). */
export function useRetirarFerramenta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (retirada: NovaRetirada) => {
      const { data } = await api.post<{ data: Emprestimo }>('/emprestimos', retirada)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferramentas'] })
      queryClient.invalidateQueries({ queryKey: ['emprestimos'] })
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
    },
  })
}
