export interface UsuarioPayload {
  id: number;
  nome: string;
  papel: 'almoxarife' | 'admin' | 'consulta';
  email?: string | null;
  matricula?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioPayload;
    }
  }
}
