import type { Notificacao } from '@/hooks/useNotificacoes'

const MINUTO_AVISO = 8 * 60 + 30 // 08:30

/** Dia útil (seg-sex) a partir das 08:30 e ainda não avisado hoje. `hoje` = AAAA-MM-DD local. */
export function devoAvisarResumo(agora: Date, ultimoAviso: string | null): boolean {
  const dia = agora.getDay()
  if (dia === 0 || dia === 6) return false
  if (agora.getHours() * 60 + agora.getMinutes() < MINUTO_AVISO) return false
  return ultimoAviso !== agora.toLocaleDateString('sv')
}

/** Texto do aviso, ou null se não há atraso nem devolução para hoje. */
export function textoResumo(lista: Pick<Notificacao, 'tipo'>[]): string | null {
  const atrasadas = lista.filter((n) => n.tipo === 'atraso').length
  const hoje = lista.filter((n) => n.tipo === 'devolucao_hoje').length
  if (atrasadas + hoje === 0) return null
  return [hoje && `${hoje} devolução(ões) prevista(s) para hoje`, atrasadas && `${atrasadas} empréstimo(s) atrasado(s)`]
    .filter(Boolean)
    .join(' · ')
}
