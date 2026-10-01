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

const CHAVE = ['notificacoes', 'nao-lidas']

/** Não lidas (`GET /v1/notificacoes?lida=false`); `meta.total` é o contador do sino. */
export function useNotificacoes(habilitado: boolean) {
  return useQuery({
    queryKey: CHAVE,
    queryFn: async () => (await api.get<ListaNotificacoes>('/notificacoes', { params: { lida: false, limit: 20 } })).data,
    enabled: habilitado,
    refetchInterval: 60_000, // notificações chegam 1x/dia, mas o polling curto pega as geradas com a sessão aberta
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
