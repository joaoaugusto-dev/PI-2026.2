import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Emprestimo } from '@/hooks/useEmprestimos'
import type { Ferramenta } from '@/hooks/useFerramentas'
import { api } from '@/lib/api'

export interface ColaboradorIdentificado {
  id: number
  nome: string
  matricula: string
  setor_id: number | null
}

/**
 * Ferramenta achada por código de patrimônio ou nome (`GET /ferramentas?q=`, que
 * já ignora zeros à esquerda). Com vários resultados, prefere o de código igual ao digitado.
 */
export function useFerramentaPorTermo(termo: string) {
  return useQuery({
    queryKey: ['ferramentas', 'por-termo', termo],
    enabled: termo.length > 0,
    queryFn: async ({ signal }): Promise<Ferramenta | null> => {
      const { data } = await api.get<{ data: Ferramenta[] }>('/ferramentas', { params: { q: termo, limit: 10 }, signal })
      const numero = /^(?:sf)?0*(\d{1,4})$/i.exec(termo)
      const exata = numero && data.data.find((f) => f.codigo_identificacao === Number(numero[1]))
      return exata || data.data[0] || null
    },
  })
}

/** `GET /colaboradores/identificar`: matrícula/crachá ou nome; 404 (não achou) vira `null` para abrir o cadastro rápido. */
export function useColaboradorPorTermo(termo: string) {
  return useQuery({
    queryKey: ['colaboradores', 'identificar', termo],
    enabled: termo.length > 0,
    retry: false,
    queryFn: async ({ signal }): Promise<ColaboradorIdentificado | null> => {
      try {
        const { data } = await api.get<{ data: ColaboradorIdentificado }>('/colaboradores/identificar', {
          params: { termo },
          signal,
        })
        return data.data
      } catch (e) {
        if ((e as { response?: { status?: number } }).response?.status === 404) return null
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
