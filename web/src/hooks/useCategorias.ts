import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Categoria {
  id: number
  nome: string
}

interface ListaCategoriasResponse {
  data: Categoria[]
  meta: { page: number; limit: number; total: number }
}

/** Categorias (grupos de ferramentas) para chips de filtro e cadastro — poucas dezenas, cabe numa página. */
export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data } = await api.get<ListaCategoriasResponse>('/categorias', { params: { limit: 100 } })
      return data.data
    },
  })
}
