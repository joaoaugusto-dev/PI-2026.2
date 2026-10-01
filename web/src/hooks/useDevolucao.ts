import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { buscarEmprestimos, type Emprestimo } from '@/hooks/useEmprestimos'
import { api } from '@/lib/api'
import { escolherPorCodigo, type Escolha } from '@/lib/patrimonio'

export type CondicaoDevolucao = 'ok' | 'avaria' | 'perda'

/**
 * Empréstimo aberto de uma ferramenta, achado por código de patrimônio ou nome
 * (`GET /emprestimos?q=`, que já ignora zeros à esquerda). Com vários abertos
 * (nome parecido), vale o de código igual ao digitado; sem ele, nenhum é escolhido.
 */
export function useEmprestimoAberto(termo: string) {
  return useQuery({
    queryKey: ['emprestimos', 'aberto', termo],
    enabled: termo.length > 0,
    queryFn: async ({ signal }): Promise<Escolha<Emprestimo>> => {
      // o filtro `situacao` é um valor só; "aberto" são as duas, então o histórico devolvido não ocupa a página
      const [noPrazo, atrasados] = await Promise.all(
        (['em_aberto', 'atrasado'] as const).map((situacao) => buscarEmprestimos({ q: termo, situacao, limit: 20 }, signal)),
      )
      return escolherPorCodigo([...noPrazo.data, ...atrasados.data], termo, (e) => e.codigo_identificacao)
    },
  })
}

interface Devolucao {
  emprestimo: Emprestimo
  condicao: CondicaoDevolucao
  /** Descrição da ocorrência (vira a observação da devolução e a descrição da ocorrência). */
  observacao?: string
  /** Custo estimado em reais (só avaria/perda); a API grava na ocorrência que a devolução abre. */
  custoEstimado?: number
}

/** `PATCH /emprestimos/:id/devolucao`. Com avaria/perda a trigger abre a ocorrência e a ferramenta vai para Indisponíveis. */
export function useDevolverEmprestimo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ emprestimo, condicao, observacao, custoEstimado }: Devolucao) => {
      const { data } = await api.patch<{ data: Emprestimo & { resumo: string } }>(
        `/emprestimos/${emprestimo.id}/devolucao`,
        {
          condicaoDevolucao: condicao,
          observacaoDevolucao: observacao || undefined,
          custoEstimado: condicao === 'ok' ? undefined : custoEstimado,
        },
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferramentas'] })
      queryClient.invalidateQueries({ queryKey: ['emprestimos'] })
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
    },
  })
}
