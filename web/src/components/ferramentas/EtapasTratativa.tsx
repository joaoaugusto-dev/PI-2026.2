import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { StatusOcorrencia } from '@/hooks/useOcorrencias'
import { cn } from '@/lib/utils'

export const ETAPAS: { valor: StatusOcorrencia; label: string }[] = [
  { valor: 'aberta', label: 'Aberta' },
  { valor: 'em_reparo', label: 'Em reparo' },
  { valor: 'cobrada', label: 'Cobrada' },
  { valor: 'resolvida', label: 'Resolvida' },
]

// perda não tem conserto: a 2ª etapa vira apuração
export const rotuloEtapa = (valor: StatusOcorrencia, perda: boolean) =>
  perda && valor === 'em_reparo' ? 'Em apuração' : ETAPAS.find((e) => e.valor === valor)?.label ?? valor

// o trilho enche em PROGRESSO_MS; cada marcador acende quando a ponta do trilho chega nele
const PROGRESSO_MS = 560

/**
 * Linha do tempo da tratativa. Ao avançar, o trilho enche até a nova etapa,
 * os marcadores no caminho acendem em sequência e o da etapa alcançada
 * "estala" com um anel que se dissolve. Só `transform`/`opacity` se movem
 * (regra de 60fps do design system); o primeiro render já nasce no estado
 * final, sem animar.
 */
export function EtapasTratativa({ etapaAtual, resolvida, perda = false }: { etapaAtual: number; resolvida: boolean; perda?: boolean }) {
  const [de, setDe] = useState(etapaAtual)
  const anterior = useRef(etapaAtual)
  const [alcancada, setAlcancada] = useState<number | null>(null)

  useEffect(() => {
    if (anterior.current === etapaAtual) return
    if (anterior.current >= 0 && etapaAtual > anterior.current) {
      setDe(anterior.current)
      setAlcancada(etapaAtual)
    }
    anterior.current = etapaAtual
  }, [etapaAtual])

  const progresso = etapaAtual <= 0 ? 0 : etapaAtual / (ETAPAS.length - 1)
  const passos = alcancada === null ? 0 : alcancada - de
  // atraso do marcador `i`: proporcional à distância que o trilho ainda precisa correr até ele
  const atraso = (i: number) =>
    alcancada !== null && i > de && i <= alcancada ? Math.round(((i - de) / passos) * PROGRESSO_MS * 0.75) : 0

  return (
    <div className="relative grid grid-cols-4">
      {/* trilho entre o centro da 1ª e da última coluna; o preenchimento escala em X (compositor) */}
      <div className="absolute top-3.5 right-[12.5%] left-[12.5%] h-0.5 -translate-y-1/2 overflow-hidden rounded-full bg-border">
        <div
          className={cn(
            'h-full origin-left transition-[transform,background-color] ease-soufer',
            resolvida ? 'bg-status-disponivel' : 'bg-foreground',
          )}
          style={{ transform: `scaleX(${progresso})`, transitionDuration: `${PROGRESSO_MS}ms, 240ms` }}
        />
      </div>

      {ETAPAS.map((etapa, index) => {
        const concluida = etapaAtual >= 0 && index <= etapaAtual
        const atual = index === etapaAtual
        const ehResolvida = etapa.valor === 'resolvida' && resolvida
        const acabouDeChegar = index === alcancada
        const delay = `${atraso(index)}ms`
        return (
          <div key={etapa.valor} className="flex flex-col items-center gap-1">
            <div className="relative flex h-7 w-full items-center justify-center">
              {acabouDeChegar && (
                <span
                  key={`pulso-${etapa.valor}`}
                  aria-hidden
                  className={cn(
                    'pointer-events-none absolute size-7 animate-etapa-pulso rounded-full',
                    ehResolvida ? 'bg-status-disponivel' : 'bg-status-indisponivel',
                  )}
                  style={{ animationDelay: delay }}
                />
              )}
              <span
                className={cn(
                  'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-rotulo font-bold transition-colors ease-soufer',
                  acabouDeChegar && 'animate-etapa-pop',
                  ehResolvida
                    ? 'border-status-disponivel bg-status-disponivel text-white'
                    : atual
                      ? 'border-status-indisponivel bg-status-indisponivel text-white'
                      : concluida
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-card text-muted-foreground',
                )}
                style={{ transitionDuration: '240ms', transitionDelay: delay, animationDelay: delay }}
              >
                {concluida && !atual ? <Check className="size-3.5 animate-check-entra" /> : index + 1}
              </span>
            </div>
            <span
              key={`${etapa.valor}-${atual}`}
              className={cn(
                'text-sm font-medium whitespace-nowrap transition-colors',
                atual && alcancada !== null && 'animate-etapa-label',
                ehResolvida
                  ? 'font-semibold text-status-disponivel'
                  : atual
                    ? 'font-semibold text-status-indisponivel'
                    : concluida
                      ? 'text-foreground'
                      : 'text-muted-foreground',
              )}
              style={{ transitionDelay: delay, animationDelay: delay }}
            >
              {rotuloEtapa(etapa.valor, perda)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
