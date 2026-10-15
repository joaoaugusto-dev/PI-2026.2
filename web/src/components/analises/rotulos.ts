import type { Metrica } from '@/hooks/useKpis'

export const METRICAS: { chave: Metrica; rotulo: string; cor: string }[] = [
  { chave: 'retiradas', rotulo: 'Retiradas', cor: 'var(--foreground)' },
  { chave: 'devolucoes', rotulo: 'Devoluções', cor: 'var(--foreground)' },
  // ocorrência é avaria/extravio: o vermelho aqui diz "problema", não identifica série
  { chave: 'ocorrencias', rotulo: 'Ocorrências', cor: 'var(--brand-red)' },
]

/** `motivo_indisponivel` do banco; `perda` aparece como "extravio" (nome final das issues #180/#181). */
export const MOTIVO: Record<string, string> = {
  avaria: 'Avaria',
  perda: 'Extravio',
  manutencao_preventiva: 'Manutenção preventiva',
  baixada: 'Baixada',
  sem_motivo: 'Sem motivo informado',
}
