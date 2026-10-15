import { useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Button } from '@/components/ui/Button'
import { avisarErro } from '@/lib/avisar-erro'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'

const LADO_SAIDA = 1024

async function recortar(arquivo: File, area: Area): Promise<File> {
  const bitmap = await createImageBitmap(arquivo)
  const lado = Math.min(LADO_SAIDA, area.width)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = Math.round(lado)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff' // JPEG não tem alfa: PNG transparente ficaria preto
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob>((ok, erro) =>
    canvas.toBlob((b) => (b ? ok(b) : erro(new Error('Falha ao recortar a imagem'))), 'image/jpeg', 0.92),
  )
  return new File([blob], arquivo.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
}

type Props = {
  arquivo: File | null
  previewUrl: string | null
  onConfirmar: (recortado: File) => void
  onCancelar: () => void
}

/** Editor 1:1 (arrastar + zoom) para a foto não ficar descentralizada no cadastro. */
export function RecortadorFoto({ arquivo, previewUrl, onConfirmar, onCancelar }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function confirmar() {
    if (!arquivo || !area) return
    setSalvando(true)
    try {
      onConfirmar(await recortar(arquivo, area))
    } catch {
      avisarErro('Não foi possível recortar a imagem.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={!!arquivo} onOpenChange={(aberto) => !aberto && onCancelar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar foto</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
          {previewUrl && (
            <Cropper
              image={previewUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, px) => setArea(px)}
            />
          )}
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Zoom"
          className="w-full"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar} disabled={!area || salvando}>
            Usar foto
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
