import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface EmprestimoCalendario {
  id: number
  ferramenta_nome: string
  ferramenta_codigo: string
  colaborador_nome: string
  setor_id: number
  setor_nome: string
  ramal: string | null
}

export interface DiaCalendario {
  dia: string // AAAA-MM-DD
  emprestimos: EmprestimoCalendario[]
}

/**
 * ponytail: formato assumido para `GET /v1/emprestimos/calendario?mes=AAAA-MM`
 * (API-17 ainda não entregue) — `data` = dias com devoluções previstas, já
 * agrupados. Se o contrato final for diferente, ajustar só este hook.
 */
export function useCalendario(mes: string) {
  return useQuery({
    queryKey: ['emprestimos', 'calendario', mes],
    queryFn: async () => {
      const { data } = await api.get<{ data: DiaCalendario[] }>('/emprestimos/calendario', { params: { mes } })
      return data.data
    },
  })
}
