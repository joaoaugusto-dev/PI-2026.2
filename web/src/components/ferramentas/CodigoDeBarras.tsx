import { useEffect, useRef } from 'react'
import Barcode from 'react-barcode'

/**
 * Code128 que preenche a largura do contêiner (a altura vem do CSS do pai): o SVG estica só no eixo
 * X, então as proporções das barras se mantêm. Deixa folga lateral, que o scanner precisa para ler.
 */
export function CodigoDeBarras({ valor }: { valor: string }) {
  const raiz = useRef<HTMLDivElement>(null)
  useEffect(() => {
    raiz.current?.querySelector('svg')?.setAttribute('preserveAspectRatio', 'none')
  }, [valor])

  return (
    <div ref={raiz}>
      <Barcode
        value={valor}
        format="CODE128"
        displayValue={false}
        margin={0}
        marginLeft={20}
        marginRight={20}
        height={100}
        background="#fff"
        lineColor="#000"
      />
    </div>
  )
}
