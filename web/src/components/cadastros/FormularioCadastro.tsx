import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import type { ZodType } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

export interface Campo {
  name: string
  label: string
  /** Sem `opcoes` é um input de texto; com `opcoes` vira select. */
  opcoes?: { value: string; label: string }[]
  placeholder?: string
  inputMode?: 'numeric'
  /** No layout em duas colunas (com `extra`), ocupa a linha inteira. */
  larga?: boolean
}

type Valores = Record<string, string>

export function FormularioCadastro({
  campos,
  schema,
  valoresIniciais,
  salvando,
  onSubmit,
  onCancelar,
  extra,
}: {
  campos: Campo[]
  schema: ZodType<Valores, Valores>
  valoresIniciais: Valores
  salvando: boolean
  onSubmit: (valores: Valores) => void
  onCancelar: () => void
  /** Conteúdo lateral (ex.: seletor de foto): com ele os campos se dividem em duas colunas ao lado dele. */
  extra?: ReactNode
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Valores>({ resolver: zodResolver(schema), defaultValues: valoresIniciais })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className={extra ? 'grid gap-4 md:grid-cols-[1fr_13rem]' : 'contents'}>
      <div className={extra ? 'grid content-start gap-x-4 gap-y-3 sm:grid-cols-2' : 'contents'}>
      {campos.map((c) => (
        <div key={c.name} className={`flex flex-col gap-1.5 ${extra && c.larga ? 'sm:col-span-2' : ''}`}>
          <Label htmlFor={c.name}>{c.label}</Label>
          {c.opcoes ? (
            <select
              id={c.name}
              aria-invalid={!!errors[c.name]}
              aria-describedby={errors[c.name] ? `${c.name}-erro` : undefined}
              {...register(c.name)}
              className="h-(--control-h) rounded-lg border border-input bg-background px-3 text-corpo"
            >
              <option value="">Selecione…</option>
              {c.opcoes.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id={c.name}
              inputMode={c.inputMode}
              placeholder={c.placeholder}
              aria-invalid={!!errors[c.name]}
              aria-describedby={errors[c.name] ? `${c.name}-erro` : undefined}
              {...register(c.name)}
            />
          )}
          {errors[c.name] && (
            <p id={`${c.name}-erro`} role="alert" className="text-rotulo text-destructive">
              {errors[c.name]?.message as string}
            </p>
          )}
        </div>
      ))}
      </div>
      {extra && <div className="md:order-last">{extra}</div>}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={salvando} onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          Salvar
        </Button>
      </div>
    </form>
  )
}
