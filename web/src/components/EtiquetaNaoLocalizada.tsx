import Barcode from 'react-barcode'
import { StatusBadge } from '@/components/StatusBadge'

/**
 * Etiqueta de patrimônio (mesmo formato Code128 da etiqueta 50x25mm das
 * ferramentas) para um item "não localizado" — a piada visual da tela 404.
 */
export function EtiquetaNaoLocalizada({
  codigo = 'SF000404',
  item = 'Página não localizada',
}: {
  codigo?: string
  item?: string
}) {
  return (
    <div className="flex w-64 -rotate-2 flex-col gap-2 rounded-lg border bg-card p-3 text-left shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <img src="/brand/soufer-assinatura.png" alt="Soufer" className="h-5 w-auto" />
        <StatusBadge status="indisponivel" />
      </div>
      <div>
        <p className="text-rotulo font-medium tracking-wide text-muted-foreground uppercase">Item</p>
        <p className="text-corpo font-medium">{item}</p>
      </div>
      <Barcode
        value={codigo}
        format="CODE128"
        height={36}
        width={1.5}
        displayValue={false}
        margin={0}
        background="transparent"
      />
      <p className="font-mono text-rotulo text-muted-foreground">{codigo}</p>
    </div>
  )
}
