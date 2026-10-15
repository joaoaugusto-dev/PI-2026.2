import { Camera, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { useEnviarFotoOcorrencia } from '@/hooks/useOcorrencias'
import { avisarErro, mensagemDeErro } from '@/lib/avisar-erro'
import { RecortadorFoto } from './RecortadorFoto'

type Props = { ocorrenciaId: number; temFoto: boolean }

/** Anexa ou troca a foto de uma ocorrência já aberta (ex.: o envio na devolução falhou). */
export function BotaoFotoOcorrencia({ ocorrenciaId, temFoto }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const enviar = useEnviarFotoOcorrencia()

  useEffect(() => {
    if (!arquivo) return setPreviewUrl(null)
    const url = URL.createObjectURL(arquivo)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [arquivo])

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          setArquivo(e.target.files?.[0] ?? null)
          e.target.value = '' // permite escolher o mesmo arquivo de novo
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={enviar.isPending} onClick={() => inputRef.current?.click()}>
        {enviar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        {temFoto ? 'Trocar foto' : 'Anexar foto'}
      </Button>
      <RecortadorFoto
        key={previewUrl ?? ''} // zera crop/zoom a cada imagem nova
        arquivo={arquivo}
        previewUrl={previewUrl}
        onCancelar={() => setArquivo(null)}
        onConfirmar={(recortada) => {
          setArquivo(null)
          enviar.mutate(
            { id: ocorrenciaId, foto: recortada },
            {
              onSuccess: () => toast.success('Foto anexada à ocorrência.'),
              onError: (e) => avisarErro(mensagemDeErro(e, 'Não foi possível enviar a foto.')),
            },
          )
        }}
      />
    </>
  )
}
