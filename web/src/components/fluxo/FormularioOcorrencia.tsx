import type { UseFormRegisterReturn } from 'react-hook-form'
import { Info } from 'lucide-react'
import { RotuloCampo } from '@/components/fluxo/RotuloCampo'

type FormularioOcorrenciaProps = {
  tipo: 'avaria' | 'perda'
  ferramenta: string
  retiradoPor: string
  matricula: string
  descricaoProps: UseFormRegisterReturn
  custoEstimado: string
  /** Recebe só os dígitos digitados; a máscara de moeda fica com quem chama. */
  onCustoChange: (digitos: string) => void
}

/**
 * Campos exibidos na devolução quando a condição é avaria ou perda (regra de negócio 3).
 * O aviso do que vai acontecer fica visível antes de confirmar; o botão "Confirmar e abrir ocorrência"
 * já é a confirmação (um checkbox a mais só somava um toque de luva sem proteger nada).
 */
export function FormularioOcorrencia({
  tipo,
  ferramenta,
  retiradoPor,
  matricula,
  descricaoProps,
  custoEstimado,
  onCustoChange,
}: FormularioOcorrenciaProps) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-2">
        <RotuloCampo>{tipo === 'avaria' ? 'O que aconteceu com a ferramenta? *' : 'Como a ferramenta foi perdida? *'}</RotuloCampo>
        <textarea
          {...descricaoProps}
          rows={2}
          autoFocus
          placeholder={tipo === 'avaria' ? 'Ex.: ponta espanada, cabo partido' : 'Ex.: esquecida na obra, caiu no tanque'}
          className="w-full resize-none rounded-lg border px-3 py-2 text-corpo outline-none focus-visible:border-brand-red focus-visible:ring-2 focus-visible:ring-brand-red/20"
        />
      </div>

      <div className="space-y-2">
        <RotuloCampo>Custo estimado (opcional)</RotuloCampo>
        <input
          value={custoEstimado}
          onChange={(e) => onCustoChange(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          placeholder="R$ 0,00"
          className="h-(--control-h) w-44 rounded-lg border px-3 text-corpo outline-none focus-visible:border-brand-red focus-visible:ring-2 focus-visible:ring-brand-red/20"
        />
      </div>

      <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <span>
          Ao confirmar, <strong>{ferramenta}</strong> vai para <strong>Indisponíveis</strong> e uma ocorrência de{' '}
          <strong>{tipo === 'avaria' ? 'avaria' : 'perda'}</strong> é aberta em nome de <strong>{retiradoPor}</strong>{' '}
          (matrícula {matricula}).
        </span>
      </p>
    </div>
  )
}
