import sharp from 'sharp';
import { ValidationError } from './errors.js';

// Tipo real pelo conteúdo (não pelo Content-Type, que o cliente controla).
function extensaoDaImagem(b: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

// foto de celular chega a ~40 MP; acima disso o sharp recusa (limita a memória por requisição)
const LIMITE_PIXELS_FOTO = 40_000_000;

/**
 * Valida o corpo cru como jpeg/png/webp e devolve webp: máx. 1280 px, qualidade 82, sem EXIF
 * (o sharp descarta metadados por padrão; rotate() aplica a orientação antes). Serve às fotos de
 * ferramenta e de ocorrência.
 */
export async function processarImagem(imagem: unknown): Promise<Buffer> {
  if (!Buffer.isBuffer(imagem) || imagem.length === 0) {
    throw new ValidationError('Envie a imagem (jpeg, png ou webp) no corpo da requisição');
  }
  if (!extensaoDaImagem(imagem)) throw new ValidationError('Arquivo não é uma imagem jpeg, png ou webp válida');
  try {
    return await sharp(imagem, { limitInputPixels: LIMITE_PIXELS_FOTO })
      .rotate()
      .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new ValidationError('Arquivo não é uma imagem jpeg, png ou webp válida');
  }
}
