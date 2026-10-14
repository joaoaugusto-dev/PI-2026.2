import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Quantos filhos de uma lista cabem inteiros na altura dela: mede de verdade, porque um nome que quebra
 * em duas linhas muda a conta. A lista tem que ter altura fixa (flex-1) e ser o `offsetParent` dos filhos
 * (`relative`). Os que não cabem ficam `invisible` no lugar (sem mudar a altura de ninguém) e o número
 * volta para o "+N" do rodapé. Refaz ao mudar a altura disponível ou a lista.
 */
export function useQuantosCabem<T extends HTMLElement>(altura: number, total: number) {
  const ref = useRef<T>(null)
  const [cabem, setCabem] = useState(total)

  useLayoutEffect(() => {
    const lista = ref.current
    if (!lista) return
    let n = 0
    for (const filho of lista.children as HTMLCollectionOf<HTMLElement>) {
      if (filho.offsetTop + filho.offsetHeight > lista.clientHeight + 1) break
      n++
    }
    setCabem(Math.max(1, n))
  }, [altura, total])

  return { ref, cabem }
}
