import { Camera, Link2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { RecortadorFoto } from './RecortadorFoto'

export type FotoSelecionada = { tipo: 'arquivo'; arquivo: File } | { tipo: 'url'; url: string }

type SeletorFotoProps = {
  value: FotoSelecionada | null
  onChange: (foto: FotoSelecionada | null) => void
  /** Sem o campo "cole uma URL" (a API só recebe arquivo). */
  semUrl?: boolean
  /** `false` esconde o X (ex.: foto que já está salva e não pode ser apagada por aqui). */
  removivel?: boolean
  /** Título do campo (padrão "Foto"). */
  rotulo?: string
}

/**
 * Dropzone quadrada de foto: escolhe o arquivo, recorta em 1:1 (RecortadorFoto) e devolve um
 * `File` JPEG; quem usa envia à API (ferramenta ou ocorrência), que reduz e converte para webp.
 * Também aceita colar uma URL (`semUrl` esconde o campo, pois a API só recebe arquivo).
 */
export function SeletorFoto({ value, onChange, semUrl = false, removivel = true, rotulo = 'Foto' }: SeletorFotoProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [urlInput, setUrlInput] = useState('')
  const [previewArquivo, setPreviewArquivo] = useState<string | null>(null)
  const [paraRecortar, setParaRecortar] = useState<File | null>(null)
  const [urlRecorte, setUrlRecorte] = useState<string | null>(null)

  useEffect(() => {
    if (!paraRecortar) return setUrlRecorte(null)
    const url = URL.createObjectURL(paraRecortar)
    setUrlRecorte(url)
    return () => URL.revokeObjectURL(url)
  }, [paraRecortar])

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
      <span className="text-sm font-medium">{rotulo}</span>
      <RecortadorFoto
        key={urlRecorte ?? ''} // zera crop/zoom/área a cada imagem nova
        arquivo={paraRecortar}
        previewUrl={urlRecorte}
        onCancelar={() => setParaRecortar(null)}
        onConfirmar={(arquivo) => {
          onChange({ tipo: 'arquivo', arquivo })
          setParaRecortar(null)
        }}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const arquivo = e.target.files?.[0]
          if (arquivo) setParaRecortar(arquivo)
          e.target.value = '' // permite escolher o mesmo arquivo de novo
        }}
      />

      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-dashed border-input bg-muted/40">
        {preview ? (
          <>
            <img src={preview} alt="Prévia da foto" className="size-full object-cover" />
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
