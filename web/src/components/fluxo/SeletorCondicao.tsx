import { cn } from '@/lib/utils'

export type Condicao = 'ok' | 'avaria' | 'perda'

const CONDICOES: { valor: Condicao; label: string; descricao: string; corTexto: string; ativa: string }[] = [
  {
    valor: 'ok',
    label: 'OK',
    descricao: 'Sem avaria · volta para o estoque',
    corTexto: 'text-status-disponivel',
    ativa: 'border-status-disponivel bg-status-disponivel text-white',
  },
  {
    valor: 'avaria',
    label: 'Avaria',
    descricao: 'Danificada · vai para reparo',
    corTexto: 'text-status-atraso',
    ativa: 'border-status-atraso bg-status-atraso text-white',
  },
  {
    valor: 'perda',
    label: 'Perda',
    descricao: 'Não retornou · abre cobrança',
    corTexto: 'text-destructive',
    ativa: 'border-destructive bg-destructive text-white',
  },
]

type SeletorCondicaoProps = {
  value: Condicao | null
  onChange: (condicao: Condicao) => void
}

export function SeletorCondicao({ value, onChange }: SeletorCondicaoProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {CONDICOES.map((c) => (
        <button
          key={c.valor}
          type="button"
          onClick={() => onChange(c.valor)}
          className={cn(
            'rounded-lg border-2 p-4 text-left transition-colors',
            value === c.valor ? c.ativa : 'border-border hover:bg-muted',
          )}
        >
          <p className={cn('text-secao font-bold', value === c.valor ? 'text-white' : c.corTexto)}>{c.label}</p>
          <p className={cn('text-sm', value === c.valor ? 'text-white/85' : 'text-muted-foreground')}>
            {c.descricao}
          </p>
        </button>
      ))}
    </div>
  )
}
