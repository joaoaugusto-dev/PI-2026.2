import { useMutation, useQuery } from '@tanstack/react-query'
import type { Ferramenta, FiltrosFerramentas } from '@/hooks/useFerramentas'
import { api } from '@/lib/api'

export interface ColaboradorConsulta {
  id: number
  nome: string
  matricula: string
  papel: 'consulta'
}

export interface SessaoConsulta {
  token: string
  colaborador: ColaboradorConsulta
}

interface ListaFerramentasResponse {
  data: Ferramenta[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

/** Abre a sessão de 15 min do quiosque (`POST /v1/consulta/sessao`) — só a matrícula, sem senha (Regra 8). */
export function useIniciarSessaoConsulta() {
  return useMutation({
    mutationFn: async (matricula: string) => {
      const { data } = await api.post<{ data: SessaoConsulta }>('/consulta/sessao', { identificador: matricula })
      return data.data
    },
  })
}

/** Mesma listagem de `/ferramentas`, exclusiva do papel `consulta` (token do quiosque precisa já estar setado via `setAuthToken`). */
export function useConsultaFerramentas(filtros: FiltrosFerramentas, habilitado: boolean) {
  return useQuery({
    queryKey: ['consulta', 'ferramentas', filtros],
    queryFn: async () => {
      const { data } = await api.get<ListaFerramentasResponse>('/consulta/ferramentas', { params: filtros })
      return data
    },
    enabled: habilitado,
    placeholderData: (dadoAnterior) => dadoAnterior,
    // Quiosque público: paginar/trocar filtro e voltar não deveria bater na
    // rede de novo a cada foco de janela/remontagem. 15s é curto o bastante
    // pra continuar refletindo mudança de status, sem refetch a cada clique.
    staleTime: 15_000,
    retry: 1,
  })
}
