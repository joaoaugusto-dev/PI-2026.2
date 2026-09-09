import { useEffect, useRef, useState } from 'react'
import { Popover } from 'radix-ui'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function paraISO(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
}

function deISO(iso: string) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

function inicioDoDia(data: Date) {
  const copia = new Date(data)
  copia.setHours(0, 0, 0, 0)
  return copia
}

function formatarLabel(iso: string) {
  return deISO(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

/**
 * Calendário próprio do sistema (não é o shadcn/react-day-picker) — grade de
 * mês construída com `Date` nativo, sem dependência nova. O painel usa
 * `Popover` do Radix (portal para `document.body`) porque um painel
 * posicionado só com `absolute` ficava atrás do rodapé fixo de confirmação,
 * que é `sticky` e cria seu próprio contexto de empilhamento.
 */
export function SeletorDataCalendario({
  value,
  onChange,
}: {
  value: string
  onChange: (iso: string) => void
}) {
  const hoje = inicioDoDia(new Date())
  const [aberto, setAberto] = useState(false)
  const [mesVisivel, setMesVisivel] = useState(() => (value ? deISO(value) : hoje))
  const painelRef = useRef<HTMLDivElement>(null)

  /** Quem opera tem pressa (leitor de código + luva) — ao abrir, o próprio
   * painel rola até ficar visível, sem exigir que a pessoa role a tela. */
  useEffect(() => {
    if (aberto) painelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [aberto])

  const primeiroDoMes = new Date(mesVisivel.getFullYear(), mesVisivel.getMonth(), 1)
  const diasNoMes = new Date(mesVisivel.getFullYear(), mesVisivel.getMonth() + 1, 0).getDate()
  const celulasVazias = primeiroDoMes.getDay()
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1)

  function selecionar(data: Date) {
    onChange(paraISO(data))
    setAberto(false)
  }

  function mudarMes(delta: number) {
    setMesVisivel(new Date(mesVisivel.getFullYear(), mesVisivel.getMonth() + delta, 1))
  }

  const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1)
  const ehHojeSelecionado = value === paraISO(hoje)
  const ehAmanhaSelecionado = value === paraISO(amanha)
  const trigger = value && !ehHojeSelecionado && !ehAmanhaSelecionado

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => selecionar(hoje)}
        className={cn(
          'h-(--control-h) flex-1 rounded-lg border px-3 text-corpo font-medium transition-colors hover:bg-muted',
          ehHojeSelecionado && 'border-transparent bg-foreground text-white hover:bg-foreground',
        )}
      >
        Hoje
      </button>
      <button
        type="button"
        onClick={() => selecionar(amanha)}
        className={cn(
          'h-(--control-h) flex-1 rounded-lg border px-3 text-corpo font-medium transition-colors hover:bg-muted',
          ehAmanhaSelecionado && 'border-transparent bg-foreground text-white hover:bg-foreground',
        )}
      >
        Amanhã
      </button>

      <Popover.Root open={aberto} onOpenChange={setAberto}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={cn(
              'flex h-(--control-h) flex-[1.4] items-center gap-2 rounded-lg border px-3 text-corpo outline-none transition-colors',
              aberto ? 'border-brand-red ring-2 ring-brand-red/20' : 'hover:bg-muted',
              trigger && 'border-transparent bg-foreground text-white hover:bg-foreground',
            )}
          >
            <CalendarDays className="size-5 shrink-0" />
            <span className={cn('flex-1 truncate text-left', !value && 'text-muted-foreground')}>
              {trigger ? formatarLabel(value) : 'Calendário'}
            </span>
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            ref={painelRef}
            align="end"
            sideOffset={8}
            className="animate-entrada z-50 w-72 space-y-3 rounded-lg border bg-card p-3 shadow-md outline-none"
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => mudarMes(-1)}
                className="flex size-8 items-center justify-center rounded-md hover:bg-muted"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="size-4" />
              </button>
              <p className="text-secao">
                {MESES[mesVisivel.getMonth()]} de {mesVisivel.getFullYear()}
              </p>
              <button
                type="button"
                onClick={() => mudarMes(1)}
                className="flex size-8 items-center justify-center rounded-md hover:bg-muted"
                aria-label="Próximo mês"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {DIAS_SEMANA.map((d, i) => (
                <span key={i} className="text-rotulo text-muted-foreground uppercase">
                  {d}
                </span>
              ))}
              {Array.from({ length: celulasVazias }, (_, i) => (
                <span key={`vazio-${i}`} />
              ))}
              {dias.map((dia) => {
                const data = new Date(mesVisivel.getFullYear(), mesVisivel.getMonth(), dia)
                const passado = data < hoje
                const selecionado = value === paraISO(data)
                const ehHoje = data.getTime() === hoje.getTime()

                return (
                  <button
                    key={dia}
                    type="button"
                    disabled={passado}
                    onClick={() => selecionar(data)}
                    className={cn(
                      'flex size-9 items-center justify-center rounded-md text-sm font-medium transition-colors',
                      passado && 'text-muted-foreground/40',
                      !passado && !selecionado && 'hover:bg-muted',
                      ehHoje && !selecionado && 'border border-brand-red text-brand-red',
                      selecionado && 'bg-brand-red text-white hover:bg-brand-red-dark',
                    )}
                  >
                    {dia}
                  </button>
                )
              })}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}
