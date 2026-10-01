import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Notificacao {
  id: number
  tipo: 'devolucao_hoje' | 'atraso' | 'ocorrencia_pendente' | 'sistema'
  titulo: string
  mensagem: string
  lida: boolean
  link: string | null
  created_at: string
}

interface ListaNotificacoes {
  data: Notificacao[]
  meta: { total: number }
}

const CHAVE = ['notificacoes']

/**
 * `GET /v1/notificacoes?lida=...`: as não lidas alimentam o sino (`meta.total` é o contador);
 * as lidas, a aba Histórico (a API apaga as lidas com mais de 30 dias).
 */
export function useNotificacoes(habilitado: boolean, lida = false) {
  return useQuery({
    queryKey: [...CHAVE, lida ? 'lidas' : 'nao-lidas'],
    queryFn: async () => (await api.get<ListaNotificacoes>('/notificacoes', { params: { lida, limit: 20 } })).data,
    enabled: habilitado,
    refetchInterval: lida ? false : 30_000, // polling curto: pega as geradas com a sessão aberta (o sino também refaz ao abrir)
  })
}

export function useMarcarLida() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => (await api.patch(`/notificacoes/${id}/lida`)).data,
    onSuccess: () => cliente.invalidateQueries({ queryKey: CHAVE }),
  })
}

export function useMarcarTodasLidas() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: async () => (await api.patch('/notificacoes/lida')).data,
    onSuccess: () => cliente.invalidateQueries({ queryKey: CHAVE }),
  })
}
