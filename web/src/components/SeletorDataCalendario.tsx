import { useEffect, useState } from 'react'
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
 * mês construída com `Date` nativo, sem dependência nova. O painel abre em
 * fluxo normal (empurra o resto do card para baixo, preso à coluna do botão
 * "Calendário") em vez de flutuar por cima do formulário: um popover
 * absoluto ficava desconectado do resto da tela e, pior, atrás do rodapé
 * fixo de confirmação (que é `sticky` e cria seu próprio contexto de
 * empilhamento — nenhuma quantidade de z-index resolve isso de fora).
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

  /** Quem opera tem pressa (leitor de código + luva) — ao abrir, a própria
   * tela rola até o fim, sem exigir que a pessoa role ela mesma. Rola a
   * janela inteira (não só até o painel aparecer) porque o rodapé de
   * confirmação é fixo (`sticky bottom-0`): parar a meio caminho deixa o
   * rodapé grudado por cima da grade, já que ele só sai do caminho quando a
   * página chega no fim de verdade. */
  useEffect(() => {
    if (!aberto) return
    const id = requestAnimationFrame(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(id)
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
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="flex gap-2 sm:flex-[2]">
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
      </div>

      <div className="flex w-full flex-col sm:flex-[1.4]">
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          className={cn(
            'flex h-(--control-h) w-full items-center gap-2 border px-3 text-corpo outline-none transition-colors',
            aberto ? 'rounded-t-lg border-brand-red ring-2 ring-brand-red/20' : 'rounded-lg hover:bg-muted',
            trigger && 'border-transparent bg-foreground text-white hover:bg-foreground',
          )}
        >
          <CalendarDays className="size-5 shrink-0" />
          <span className={cn('flex-1 truncate text-left', !value && 'text-muted-foreground')}>
            {trigger ? formatarLabel(value) : 'Calendário'}
          </span>
        </button>

        {aberto && (
          <div className="animate-entrada w-full space-y-3 rounded-b-lg border border-t-0 border-brand-red/40 bg-card p-3">
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

            <div className="grid grid-cols-7 gap-1">
              {DIAS_SEMANA.map((d, i) => (
                <div key={i} className="flex h-6 items-center justify-center text-rotulo text-muted-foreground uppercase">
                  {d}
                </div>
              ))}
              {Array.from({ length: celulasVazias }, (_, i) => (
                <div key={`vazio-${i}`} />
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
                      'flex aspect-square w-full items-center justify-center rounded-md text-base font-bold transition-colors',
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
          </div>
        )}
      </div>
    </div>
  )
}
