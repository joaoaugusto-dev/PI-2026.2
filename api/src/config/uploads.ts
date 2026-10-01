import path from 'path';

// Fotos de ferramentas ficam em disco (ponytail: um único servidor/EC2; em
// Render/Railway o disco é efêmero e S3 entra no lugar daqui). UPLOADS_DIR
// aponta para um volume persistente em produção.
export const uploadsDir = path.resolve(process.env.UPLOADS_DIR ?? 'uploads');
