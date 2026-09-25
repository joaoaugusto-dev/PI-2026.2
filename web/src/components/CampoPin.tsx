import { forwardRef, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const DURACAO_REVELACAO_MS = 1000

/**
 * PIN de 6 dígitos estilo lock screen: um input real (invisível, cobre as
 * caixas) capta o teclado numérico, as caixas são só visuais. O último
 * dígito digitado fica visível por 1s antes de virar bolinha — os
 * anteriores já são bolinha, porque só existe um "índice revelado" por vez.
 * Repassa o ref pro input real, pra outro campo poder chamar `.focus()`
 * nele (ex.: matrícula pulando pra cá ao completar os dígitos).
 */
export const CampoPin = forwardRef<
  HTMLInputElement,
  {
    id?: string
    name?: string
    value: string
    onChange: (valor: string) => void
    onBlur?: () => void
    length?: number
    autoFocus?: boolean
    erro?: boolean
    autoComplete?: string
  }
>(function CampoPin({ id, name, value, onChange, onBlur, length = 6, autoFocus, erro, autoComplete }, ref) {
  const [indiceRevelado, setIndiceRevelado] = useState<number | null>(null)
  const [focado, setFocado] = useState(false)
  const timeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const novo = e.target.value.replace(/\D/g, '').slice(0, length)
    window.clearTimeout(timeoutRef.current)

    if (novo.length > value.length) {
      const indice = novo.length - 1
      setIndiceRevelado(indice)
      timeoutRef.current = window.setTimeout(() => setIndiceRevelado(null), DURACAO_REVELACAO_MS)
    } else {
      setIndiceRevelado(null)
    }

    onChange(novo)
  }

  return (
    <div className="relative">
      <input
        ref={ref}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        pattern="\d*"
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-invalid={erro}
        value={value}
        maxLength={length}
        onChange={handleChange}
        onFocus={() => setFocado(true)}
        onBlur={() => {
          setFocado(false)
          onBlur?.()
        }}
        className="absolute inset-0 z-10 h-full w-full cursor-default opacity-0"
      />
      <div className="mx-auto flex max-w-xs items-center justify-between" aria-hidden>
        {Array.from({ length }).map((_, indice) => {
          const digito = value[indice]
          const ativo = focado && indice === value.length
          return (
            <div key={indice} className="flex items-center">
              {indice === length / 2 && <span className="mr-2 text-titulo text-muted-foreground">–</span>}
              <div
                className={cn(
                  'flex h-(--control-h) w-11 items-center justify-center rounded-lg border border-input bg-transparent text-titulo transition-colors',
                  digito && 'border-ring',
                  ativo && 'border-ring ring-3 ring-ring/50',
                  erro && 'border-destructive ring-3 ring-destructive/20',
                )}
              >
                {digito ? (indice === indiceRevelado ? digito : '•') : ''}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})
