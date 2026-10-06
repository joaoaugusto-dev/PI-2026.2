import { useEffect, useState } from 'react'
import { avisarErro } from '@/lib/avisar-erro'

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
          await Promise.all(logos.map((img) => img.decode()))
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
