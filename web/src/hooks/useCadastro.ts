import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface ListaCadastro<T> {
  data: T[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

/** Recursos de cadastro (`/setores`, `/categorias`, `/colaboradores`, `/ferramentas`) têm o mesmo contrato de CRUD. */
export type Recurso = 'setores' | 'categorias' | 'colaboradores' | 'ferramentas'

/**
 * A chave começa pelo recurso de propósito: `invalidateQueries({ queryKey: [recurso] })` também
 * invalida as listas e o detalhe de `useFerramentas`/`useFerramenta` (mesmo prefixo
 * `'ferramentas'`), que é o que se quer depois de criar, editar ou inativar.
 */
export function useListaCadastro<T>(recurso: Recurso, params: Record<string, unknown>) {
  return useQuery({
    queryKey: [recurso, 'lista', params],
    queryFn: async () => (await api.get<ListaCadastro<T>>(`/${recurso}`, { params })).data,
    placeholderData: (anterior) => anterior,
  })
}

export function useSalvarCadastro(recurso: Recurso) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: number; dados: Record<string, unknown> }) =>
      id ? api.patch(`/${recurso}/${id}`, dados) : api.post(`/${recurso}`, dados),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [recurso] }),
  })
}

export function useInativarCadastro(recurso: Recurso) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/${recurso}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [recurso] }),
  })
}
