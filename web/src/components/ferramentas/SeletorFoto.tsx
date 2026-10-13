import { Camera, Link2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export type FotoSelecionada = { tipo: 'arquivo'; arquivo: File } | { tipo: 'url'; url: string }

type SeletorFotoProps = {
  value: FotoSelecionada | null
  onChange: (foto: FotoSelecionada | null) => void
  /** Sem o campo "cole uma URL" (a API só recebe arquivo). */
  semUrl?: boolean
  /** `false` esconde o X (ex.: foto que já está salva e não pode ser apagada por aqui). */
  removivel?: boolean
}

/**
 * Dropzone quadrada de foto (cadastro de ferramenta): upload manual de
 * arquivo ou cola de uma URL de imagem já hospedada em outro lugar. Só o
 * preview local/remoto por enquanto — a coluna `ferramentas.foto_url` existe
 * no banco (migração 0001), mas não há endpoint de upload/armazenamento
 * físico na API ainda (onde a imagem seria salva fica pra depois), então
 * nada disso é enviado no submit (ver comentário no `onSubmit` da página).
 */
export function SeletorFoto({ value, onChange, semUrl = false, removivel = true }: SeletorFotoProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [urlInput, setUrlInput] = useState('')
  const [previewArquivo, setPreviewArquivo] = useState<string | null>(null)

  useEffect(() => {
    if (value?.tipo !== 'arquivo') {
      setPreviewArquivo(null)
      return
    }
    const url = URL.createObjectURL(value.arquivo)
    setPreviewArquivo(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  const preview = value?.tipo === 'arquivo' ? previewArquivo : (value?.url ?? null)

  function aplicarUrl() {
    const url = urlInput.trim()
    if (!url) return
    onChange({ tipo: 'url', url })
    setUrlInput('')
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Foto</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const arquivo = e.target.files?.[0]
          if (arquivo) onChange({ tipo: 'arquivo', arquivo })
        }}
      />

      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-dashed border-input bg-muted/40">
        {preview ? (
          <>
            <img src={preview} alt="Prévia da ferramenta" className="size-full object-cover" />
            {removivel && (
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label="Remover foto"
              className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-md bg-foreground/70 text-background transition-colors hover:bg-foreground"
            >
              <X className="size-3.5" />
            </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex size-full flex-col items-center justify-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Camera className="size-6" />
            <span className="text-rotulo font-medium">Adicionar foto</span>
          </button>
        )}
      </div>

      {!preview && !semUrl && (
        <div className="flex w-full items-center gap-1.5">
          <div className="relative flex-1">
            <Link2 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  aplicarUrl()
                }
              }}
              placeholder="ou cole uma URL"
              className="pl-8"
            />
          </div>
          <Button type="button" size="icon-lg" variant="outline" aria-label="Usar esta URL" onClick={aplicarUrl} disabled={!urlInput.trim()}>
            <Link2 className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
