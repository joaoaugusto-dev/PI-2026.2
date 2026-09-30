import type { Emprestimo, SituacaoEmprestimo } from '@/hooks/useEmprestimos'
import { rotuloCondicao } from '@/lib/formatar'

export const ROTULO_SITUACAO: Record<SituacaoEmprestimo, string> = {
  em_aberto: 'Em aberto',
  atrasado: 'Atrasado',
  devolvido: 'Devolvido',
}

/** Cor do texto da situação (tokens de status do design system). */
export const COR_SITUACAO: Record<SituacaoEmprestimo, string> = {
  em_aberto: 'text-status-em-uso',
  atrasado: 'text-status-atraso',
  devolvido: 'text-status-disponivel',
}

/** "Devolvido · Avaria": situação mais a condição quando a devolução não foi ok. */
export function textoSituacao(e: Pick<Emprestimo, 'situacao' | 'condicao_devolucao'>) {
  const condicao =
    e.condicao_devolucao && e.condicao_devolucao !== 'ok' ? ` · ${rotuloCondicao(e.condicao_devolucao)}` : ''
  return ROTULO_SITUACAO[e.situacao] + condicao
}
