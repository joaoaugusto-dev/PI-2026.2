export interface UsuarioPayload {
  id: number;
  nome: string;
  papel: 'manutencao' | 'admin' | 'consulta';
  matricula?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioPayload;
    }
  }
}
