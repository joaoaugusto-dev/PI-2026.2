import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Largura e altura de um elemento, atualizadas a cada mudança de tamanho dele (ResizeObserver) — e não da
 * janela: abrir ou recolher a sidebar muda a área útil sem mudar a janela.
 */
export function useTamanhoElemento<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [tamanho, setTamanho] = useState({ largura: 0, altura: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const medir = () => {
      const { width, height } = el.getBoundingClientRect()
      setTamanho((t) => (t.largura === Math.round(width) && t.altura === Math.round(height) ? t : { largura: Math.round(width), altura: Math.round(height) }))
    }
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  return { ref, ...tamanho }
}
