import { useEffect, useState } from 'react'
import { avisarErro } from '@/lib/avisar-erro'

const TIMEOUT_LOGO_MS = 5000

/**
 * Impressão sob demanda: `imprimindo` liga o conteúdo de impressão (etiqueta/crachá no <body>), espera
 * o código de barras ser desenhado (dois quadros, para o SVG já estar no DOM), espera o logo (`/brand/`) carregar e decodificar, abre a impressão e desliga.
 * Se o logo não carregar, não imprime: uma etiqueta sem logo não pode sair. Com um botão por linha de lista, montar
 * todas as etiquetas de antemão faria a impressão levar todas de uma vez.
 */
export function useImprimir() {
  const [imprimindo, setImprimindo] = useState(false)

  useEffect(() => {
    if (!imprimindo) return
    let quadro2 = 0
    let cancelado = false
    const quadro1 = requestAnimationFrame(() => {
      quadro2 = requestAnimationFrame(async () => {
        const logos = [...document.querySelectorAll<HTMLImageElement>('img[src^="/brand/"]')]
        try {
          // sem nenhum logo no DOM não há o que esperar, mas também não há etiqueta/crachá válido para sair
          if (logos.length === 0) throw new Error('logo ausente')
          // um src que nunca resolve deixaria o decode() pendente: o timeout libera o botão
          await Promise.race([
            Promise.all(logos.map((img) => img.decode())),
            new Promise((_, rejeitar) => window.setTimeout(() => rejeitar(new Error('timeout')), TIMEOUT_LOGO_MS)),
          ])
          if (!cancelado) window.print()
        } catch {
          if (!cancelado) avisarErro('Não foi possível carregar o logo da Soufer. Tente imprimir de novo.')
        }
        if (!cancelado) setImprimindo(false)
      })
    })
    return () => {
      cancelado = true
      cancelAnimationFrame(quadro1)
      cancelAnimationFrame(quadro2)
    }
  }, [imprimindo])

  return { imprimindo, imprimir: () => setImprimindo(true) }
}
