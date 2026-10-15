import path from 'path';

// Fotos de ferramentas ficam em disco (ponytail: um único servidor/EC2; em
// Render/Railway o disco é efêmero e S3 entra no lugar daqui). UPLOADS_DIR
// aponta para um volume persistente em produção (no Dokploy, monte o volume
// em <app>/data/ferramentas, que é o padrão).
export const uploadsDir = path.resolve(process.env.UPLOADS_DIR ?? 'data/ferramentas');

// Fotos de avaria/perda, em pasta própria (não misturam com as das ferramentas).
// AVARIAS_DIR também precisa de volume persistente em produção.
export const avariasDir = path.resolve(process.env.AVARIAS_DIR ?? 'data/avarias');
