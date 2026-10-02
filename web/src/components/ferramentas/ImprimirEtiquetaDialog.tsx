import { BotaoImprimirEtiqueta } from '@/components/ferramentas/BotaoImprimirEtiqueta'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { formatarPatrimonio, type Ferramenta } from '@/hooks/useFerramentas'

/** Pop-up "imprimir a etiqueta agora?" logo depois de cadastrar uma ferramenta. */
export function ImprimirEtiquetaDialog({
  ferramenta,
  aoFechar,
}: {
  ferramenta: Ferramenta | null
  aoFechar: () => void
}) {
  return (
    <Dialog open={ferramenta !== null} onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Imprimir a etiqueta?</DialogTitle>
          <DialogDescription>
            {ferramenta?.nome} foi cadastrada como {ferramenta && formatarPatrimonio(ferramenta.codigo_identificacao)}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={aoFechar}>
            Agora não
          </Button>
          {ferramenta && <BotaoImprimirEtiqueta ferramenta={ferramenta} />}
        </div>
      </DialogContent>
    </Dialog>
  )
}
