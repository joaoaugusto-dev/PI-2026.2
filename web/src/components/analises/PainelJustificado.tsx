import { useEffect, useMemo, useState, type RefObject } from 'react'
import { CartaoAnalise } from '@/components/analises/CartaoAnalise'
import type { Cartao } from '@/components/analises/catalogo'
import { FATOR_TAMANHO, type Tamanho } from '@/hooks/usePreferenciasAnalises'
import { useTamanhoElemento } from '@/hooks/useTamanhoElemento'
import { montarLinhas } from '@/lib/layout-justificado'
import type { Periodo } from '@/lib/periodo'

const ESPACO = 12 // gap-3

/** Altura de tela que sobra abaixo do topo do painel: duas linhas e pouco cabem sem rolar. */
function useAlturaVisivel(ref: RefObject<HTMLElement | null>) {
  const [altura, setAltura] = useState(() => window.innerHeight)
  useEffect(() => {
    const medir = () => setAltura(window.innerHeight - ((ref.current?.getBoundingClientRect().top ?? 0) + window.scrollY))
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [ref])
  return altura
}

/**
 * Painel com layout justificado (como uma galeria de fotos): cada linha ocupa a largura toda e cada cartão
 * fica com largura proporcional ao formato dele, sem buraco no fim da linha. A largura é a do próprio
 * painel (muda ao abrir/recolher a sidebar) e a altura alvo das linhas sai da altura visível da tela.
 */
export function PainelJustificado({ cartoes, tamanhos, periodo }: { cartoes: Cartao<unknown>[]; tamanhos: Record<string, Tamanho>; periodo: Periodo }) {
  const { ref, largura } = useTamanhoElemento<HTMLDivElement>()
  const alturaVisivel = useAlturaVisivel(ref)

  const linhas = useMemo(() => {
    // alvo: ~2,3 linhas por tela; teto evita um cartão sozinho do tamanho de um outdoor num monitor largo
    const alturaAlvo = Math.min(420, Math.max(240, (alturaVisivel - 16) / 2.3))
    return montarLinhas(
      cartoes.map((c) => ({ id: c.id, proporcao: c.proporcao * FATOR_TAMANHO[tamanhos[c.id] ?? 'M'], larguraMin: c.larguraMin, alturaMin: c.alturaMin })),
      { largura, alturaAlvo, alturaMax: alturaAlvo * 1.35, espaco: ESPACO },
    )
  }, [cartoes, tamanhos, largura, alturaVisivel])

  const porId = new Map(cartoes.map((c) => [c.id, c]))

  return (
    <div ref={ref} className="flex flex-col gap-3">
      {linhas.map((linha) => (
        <div key={linha.pecas.map((p) => p.id).join()} className="flex gap-3" style={{ height: linha.altura }}>
          {linha.pecas.map((p) => (
            // flex-grow na largura calculada: o flex distribui o arredondamento e a linha fecha exata
            <div key={p.id} className="min-w-0" style={{ flex: `${p.largura} 1 0` }}>
              <CartaoAnalise cartao={porId.get(p.id)!} periodo={periodo} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
