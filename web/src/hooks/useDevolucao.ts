import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { buscarEmprestimos, type Emprestimo } from '@/hooks/useEmprestimos'
import type { HistoricoFerramenta } from '@/hooks/useOcorrencias'
import { api } from '@/lib/api'

export type CondicaoDevolucao = 'ok' | 'avaria' | 'perda'

/**
 * Empréstimo aberto de uma ferramenta, achado por código de patrimônio ou nome
 * (`GET /emprestimos?q=`, que já ignora zeros à esquerda). Com vários abertos
 * (nome parecido), prefere o de código exatamente igual ao digitado.
 */
export function useEmprestimoAberto(termo: string) {
  return useQuery({
    queryKey: ['emprestimos', 'aberto', termo],
    enabled: termo.length > 0,
    queryFn: async ({ signal }): Promise<Emprestimo | null> => {
      const { data } = await buscarEmprestimos({ q: termo, limit: 50 }, signal)
      const abertos = data.filter((e) => !e.data_devolucao)
      const numero = /^(?:sf)?0*(\d{1,4})$/i.exec(termo)
      const exato = numero && abertos.find((e) => e.codigo_identificacao === Number(numero[1]))
      return exato || abertos[0] || null
    },
  })
}

interface Devolucao {
  emprestimo: Emprestimo
  condicao: CondicaoDevolucao
  /** Descrição da ocorrência (vira a observação da devolução e a descrição da ocorrência). */
  observacao?: string
  /** Custo estimado em reais; a devolução não recebe, então vai num PATCH da ocorrência aberta por ela. */
  custoEstimado?: number
}

/** `PATCH /emprestimos/:id/devolucao`. Com avaria/perda a trigger abre a ocorrência e a ferramenta vai para Indisponíveis. */
export function useDevolverEmprestimo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ emprestimo, condicao, observacao, custoEstimado }: Devolucao) => {
      const { data } = await api.patch<{ data: Emprestimo & { resumo: string } }>(
        `/emprestimos/${emprestimo.id}/devolucao`,
        { condicaoDevolucao: condicao, observacaoDevolucao: observacao || undefined },
      )
      if (condicao !== 'ok' && custoEstimado && emprestimo.ferramenta_id) {
        try {
          const { data: h } = await api.get<{ data: HistoricoFerramenta }>(
            `/ferramentas/${emprestimo.ferramenta_id}/historico`,
          )
          const ocorrencia = h.data.ocorrencias.find((o) => o.emprestimo_id === emprestimo.id)
          if (ocorrencia) await api.patch(`/ocorrencias/${ocorrencia.id}`, { custoEstimado })
        } catch {
          // a devolução e a ocorrência já estão salvas; o custo pode ser ajustado depois
        }
      }
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferramentas'] })
      queryClient.invalidateQueries({ queryKey: ['emprestimos'] })
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
    },
  })
}
