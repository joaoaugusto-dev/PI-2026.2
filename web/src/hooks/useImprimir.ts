import { useEffect, useState } from 'react'

/**
 * Impressão sob demanda: `imprimindo` liga o conteúdo de impressão (etiqueta/crachá no <body>), espera
 * o código de barras ser desenhado (dois quadros, para o SVG já estar no DOM), abre a impressão e desliga. Com um botão por linha de lista, montar
 * todas as etiquetas de antemão faria a impressão levar todas de uma vez.
 */
export function useImprimir() {
  const [imprimindo, setImprimindo] = useState(false)

  useEffect(() => {
    if (!imprimindo) return
    let quadro2 = 0
    const quadro1 = requestAnimationFrame(() => {
      quadro2 = requestAnimationFrame(() => {
        window.print()
        setImprimindo(false)
      })
    })
    return () => {
      cancelAnimationFrame(quadro1)
      cancelAnimationFrame(quadro2)
    }
  }, [imprimindo])

  return { imprimindo, imprimir: () => setImprimindo(true) }
}
