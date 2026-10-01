import { useEffect, useState } from 'react'

/**
 * Impressão sob demanda: `imprimindo` liga o conteúdo de impressão (etiqueta/crachá no <body>), espera
 * o código de barras ser desenhado, abre a impressão e desliga. Com um botão por linha de lista, montar
 * todas as etiquetas de antemão faria a impressão levar todas de uma vez.
 */
export function useImprimir() {
  const [imprimindo, setImprimindo] = useState(false)

  useEffect(() => {
    if (!imprimindo) return
    const id = setTimeout(() => {
      window.print()
      setImprimindo(false)
    }, 100)
    return () => clearTimeout(id)
  }, [imprimindo])

  return { imprimindo, imprimir: () => setImprimindo(true) }
}
