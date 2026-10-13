import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Setor {
  id: number
  nome: string
}

interface ListaSetoresResponse {
  data: Setor[]
  meta: { page: number; limit: number; total: number }
}

/** Setores da fábrica, para o select de localização/destino — poucas dezenas, cabe numa página. */
export function useSetores() {
  return useQuery({
    queryKey: ['setores'],
    queryFn: async () => {
      const { data } = await api.get<ListaSetoresResponse>('/setores', { params: { limit: 100 } })
      return data.data
    },
  })
}
