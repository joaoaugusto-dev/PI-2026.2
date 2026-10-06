import { api } from '@/lib/api'

/** `foto_url` da API é relativo (`/uploads/x.jpg`, servido em `/v1/uploads`); URLs absolutas passam direto. */
export function urlDaFoto(fotoUrl: string): string {
  return fotoUrl.startsWith('/uploads/') ? `${api.defaults.baseURL}${fotoUrl}` : fotoUrl
}

const LADO_MAXIMO = 1280

/**
 * Foto de celular passa fácil de 5 MB (limite da API): reduz para no máximo 1280 px no maior
 * lado e regrava em JPEG. `createImageBitmap` já aplica a orientação EXIF (foto não sai deitada).
 */
export async function comprimirImagem(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo)
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao comprimir a imagem'))), 'image/jpeg', 0.92),
  )
}
