import { ArrowDown, ArrowUp, SlidersHorizontal } from 'lucide-react'
import type { Cartao } from '@/components/analises/catalogo'
import { Button } from '@/components/ui/Button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/Sheet'
import { Switch } from '@/components/ui/Switch'
import type { Preferencias, Tamanho } from '@/hooks/usePreferenciasAnalises'
import { cn } from '@/lib/utils'

const TAMANHOS: { id: Tamanho; rotulo: string }[] = [
  { id: 'P', rotulo: 'Pequeno' },
  { id: 'M', rotulo: 'Médio' },
  { id: 'G', rotulo: 'Grande' },
]

interface Props {
  cartoes: Cartao<unknown>[]
  prefs: Preferencias
  alterar: (mudanca: Partial<Preferencias>) => void
  restaurar: () => void
}

/** Escolhe quais cartões aparecem, em que ordem e de que tamanho. O layout se refaz sozinho a cada mudança. */
export function PersonalizarPainel({ cartoes, prefs, alterar, restaurar }: Props) {
  const ids = prefs.ordem.filter((id) => cartoes.some((c) => c.id === id))
  const mover = (id: string, passo: -1 | 1) => {
    const ordem = [...prefs.ordem]
    // troca com o vizinho visível (pula cartão que esta pessoa não pode ver)
    const de = ordem.indexOf(id)
    const para = ordem.indexOf(ids[ids.indexOf(id) + passo])
    ;[ordem[de], ordem[para]] = [ordem[para], ordem[de]]
    alterar({ ordem })
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <SlidersHorizontal />
          Personalizar
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="text-secao">Personalizar painel</SheetTitle>
          <SheetDescription>Ligue os cartões que quer ver, mude a ordem e o tamanho. Fica salvo neste navegador.</SheetDescription>
        </SheetHeader>
        <ol className="flex-1 divide-y overflow-y-auto px-4">
          {ids.map((id, i) => {
            const cartao = cartoes.find((c) => c.id === id)!
            const visivel = !prefs.ocultos.includes(id)
            const tamanho = prefs.tamanhos[id] ?? 'M'
            return (
              <li key={id} className="flex flex-col gap-2 py-3">
                <div className="flex items-center gap-1">
                  <label className="flex min-w-0 flex-1 items-center gap-3">
                    <Switch
                      checked={visivel}
                      onCheckedChange={(ligado) => alterar({ ocultos: ligado ? prefs.ocultos.filter((x) => x !== id) : [...prefs.ocultos, id] })}
                    />
                    <span className={cn('text-corpo font-medium', !visivel && 'text-muted-foreground')}>{cartao.titulo}</span>
                  </label>
                  <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => mover(id, -1)}>
                    <ArrowUp />
                    Subir
                  </Button>
                  <Button size="sm" variant="ghost" disabled={i === ids.length - 1} onClick={() => mover(id, 1)}>
                    <ArrowDown />
                    Descer
                  </Button>
                </div>
                {visivel && (
                  <div className="ml-12 flex">
                    <div className="flex rounded-lg border p-0.5" role="group" aria-label={`Tamanho de ${cartao.titulo}`}>
                      {TAMANHOS.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          aria-pressed={tamanho === t.id}
                          onClick={() => alterar({ tamanhos: { ...prefs.tamanhos, [id]: t.id } })}
                          className={cn(
                            'h-10 rounded-md px-3 text-sm transition-colors',
                            tamanho === t.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
                          )}
                        >
                          {t.rotulo}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
        <SheetFooter className="border-t">
          <Button variant="outline" onClick={restaurar}>
            Restaurar padrão
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
