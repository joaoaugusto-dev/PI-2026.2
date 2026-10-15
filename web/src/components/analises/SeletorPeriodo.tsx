import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { dataBR, hojeBrasilia } from '@/lib/formatar'
import { ATALHOS, diasNoPeriodo, erroDoPeriodo, type Atalho, type Periodo } from '@/lib/periodo'

interface Props {
  atalho: Atalho
  periodo: Periodo
  personalizado: Periodo
  aoMudar: (mudanca: { atalho: Atalho; personalizado?: Periodo }) => void
}

/** Filtro único do painel (vale para todos os cartões): atalhos de um toque e intervalo livre de até 366 dias. */
export function SeletorPeriodo({ atalho, periodo, personalizado, aoMudar }: Props) {
  const erro = atalho === 'personalizado' ? erroDoPeriodo(personalizado) : null
  const hoje = hojeBrasilia().iso

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
        {[...ATALHOS, { id: 'personalizado' as const, rotulo: 'Personalizado' }].map((a) => (
          <Button
            key={a.id}
            size="sm"
            variant={atalho === a.id ? 'default' : 'outline'}
            aria-pressed={atalho === a.id}
            // ao abrir o personalizado, ele começa no intervalo que já estava na tela
            onClick={() => aoMudar(a.id === 'personalizado' && atalho !== 'personalizado' ? { atalho: a.id, personalizado: periodo } : { atalho: a.id })}
          >
            {a.rotulo}
          </Button>
        ))}
      </div>
      {atalho === 'personalizado' && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            De
            <Input type="date" className="w-44 text-foreground" value={personalizado.de} max={hoje} aria-invalid={!!erro} onChange={(e) => aoMudar({ atalho, personalizado: { ...personalizado, de: e.target.value } })} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            Até
            <Input type="date" className="w-44 text-foreground" value={personalizado.ate} max={hoje} aria-invalid={!!erro} onChange={(e) => aoMudar({ atalho, personalizado: { ...personalizado, ate: e.target.value } })} />
          </label>
        </div>
      )}
      <p className={erro ? 'text-sm font-medium text-destructive' : 'text-sm text-muted-foreground'} aria-live="polite">
        {erro ?? `${dataBR(periodo.de)} a ${dataBR(periodo.ate)} · ${diasNoPeriodo(periodo)} ${diasNoPeriodo(periodo) === 1 ? 'dia' : 'dias'}`}
      </p>
    </div>
  )
}
