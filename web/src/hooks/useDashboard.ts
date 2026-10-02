import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { StatusOcorrencia } from '@/hooks/useOcorrencias'

export interface EmprestimoPendente {
  id: number
  colaborador_nome: string
  colaborador_matricula: string
  setor_nome: string
  ferramenta_nome: string
  codigo_identificacao: number | null
  previsao_devolucao: string
  /** Atrasados: dias de atraso. Próximos do prazo: dias que faltam. Cobrar hoje: 0. */
  dias: number
}

export interface FerramentaAguardando {
  ferramenta_id: number
  ferramenta_nome: string
  codigo_identificacao: number | null
  ocorrencia_id: number | null
  tipo: string | null
  etapa: StatusOcorrencia | null
  dias_parada: number
}

export interface Lista<T> {
  total: number
  itens: T[]
}

export interface Kpis {
  cadastradas: number
  disponiveis: number
  em_uso: number
  indisponiveis: number
  atrasadas: number
  ocorrencias: number
}

export interface Dashboard {
  kpis: Kpis
  cobrar_hoje: Lista<EmprestimoPendente>
  atrasados: Lista<EmprestimoPendente>
  proximos_do_prazo: Lista<EmprestimoPendente>
  indisponiveis: Lista<FerramentaAguardando>
}

export type NomeLista = 'cobrar_hoje' | 'atrasados' | 'proximos_do_prazo' | 'indisponiveis'

/** Linhas por página do "Mostrar tudo" (a API aceita até 50). */
export const POR_PAGINA = 15

/** `GET /dashboard/:lista`: a lista completa de um cartão, paginada; só consulta com o pop-up aberto. */
export function useListaDashboard<T>(lista: NomeLista, page: number, aberto: boolean) {
  return useQuery({
    queryKey: ['dashboard', lista, page],
    enabled: aberto,
    queryFn: async () =>
      (
        await api.get<{ data: T[]; meta: { page: number; totalPages: number; total: number } }>(`/dashboard/${lista}`, {
          params: { page, limit: POR_PAGINA },
        })
      ).data,
    placeholderData: (anterior) => anterior,
  })
}

/** `GET /dashboard`: só o que pede ação do balcão (cobrar hoje, atrasados, próximos do prazo, indisponíveis). */
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get<{ data: Dashboard }>('/dashboard')).data.data,
    // retiradas e devoluções acontecem o dia todo no balcão
    refetchInterval: 60_000,
  })
}
