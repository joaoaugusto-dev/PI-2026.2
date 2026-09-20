import type { UseFormRegisterReturn } from 'react-hook-form'
import { RotuloCampo } from '@/components/fluxo/RotuloCampo'
import { cn } from '@/lib/utils'

type FormularioOcorrenciaProps = {
  tipo: 'avaria' | 'perda'
  ferramenta: string
  retiradoPor: string
  matricula: string
  descricaoProps: UseFormRegisterReturn
  confirmacaoProps: UseFormRegisterReturn
  custoEstimado: string
  /** Recebe só os dígitos digitados; a máscara de moeda fica com quem chama. */
  onCustoChange: (digitos: string) => void
  confirmado: boolean
}

/** Campos exibidos na devolução quando a condição é avaria ou perda (regra de negócio 3). */
export function FormularioOcorrencia({
  tipo,
  ferramenta,
  retiradoPor,
  matricula,
  descricaoProps,
  confirmacaoProps,
  custoEstimado,
  onCustoChange,
  confirmado,
}: FormularioOcorrenciaProps) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-2">
        <RotuloCampo>Descrição da ocorrência *</RotuloCampo>
        <textarea
          {...descricaoProps}
          rows={3}
          placeholder="O que aconteceu com a ferramenta"
          className="w-full resize-none rounded-lg border px-3 py-2 text-corpo outline-none focus-visible:border-brand-red focus-visible:ring-2 focus-visible:ring-brand-red/20"
        />
      </div>

      <div className="space-y-2">
        <RotuloCampo>Custo estimado</RotuloCampo>
        <input
          value={custoEstimado}
          onChange={(e) => onCustoChange(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          placeholder="R$ 0,00"
          className="h-9 w-40 rounded-md border px-2.5 text-sm outline-none focus-visible:border-brand-red"
        />
        <p className="text-sm text-muted-foreground">Opcional. Pode ser ajustado depois na tratativa.</p>
      </div>

      <label
        className={cn(
          'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm',
          !confirmado && 'border-destructive',
        )}
      >
        <input type="checkbox" {...confirmacaoProps} className="mt-0.5 size-4 shrink-0 accent-brand-red" />
        <span>
          Confirmo que <strong>{ferramenta}</strong> vai para <strong>Indisponíveis</strong> e que uma ocorrência de{' '}
          <strong>{tipo === 'avaria' ? 'Avaria' : 'Perda'}</strong> será aberta em nome de{' '}
          <strong>{retiradoPor}</strong> (matrícula {matricula}).
        </span>
      </label>
    </div>
  )
}
