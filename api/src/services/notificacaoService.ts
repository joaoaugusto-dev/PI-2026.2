import { query } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';

export interface Notificacao {
  id: number;
  tipo: 'devolucao_hoje' | 'atraso' | 'ocorrencia_pendente' | 'sistema';
  titulo: string;
  mensagem: string;
  lida: boolean;
  link: string | null;
  created_at: string;
}

const COLUNAS = 'id, tipo, titulo, mensagem, lida, link, created_at';

// usuario_id NULL = notificação da equipe toda (gerada por fn_gerar_notificacoes);
// ponytail: "lida" é compartilhada entre os usuários, por usuário só se pedirem.
export async function listar({
  usuarioId,
  lida,
  offset,
  limit,
}: {
  usuarioId: number;
  lida?: boolean;
  offset: number;
  limit: number;
}): Promise<{ rows: Notificacao[]; total: number }> {
  const params: unknown[] = [usuarioId];
  let filtro = '';
  if (lida !== undefined) {
    params.push(lida);
    filtro = `AND lida = $${params.length}`;
  }
  const where = `WHERE (usuario_id IS NULL OR usuario_id = $1) ${filtro}`;
  const [totalResult, rowsResult] = await Promise.all([
    query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM notificacoes ${where}`, params),
    query<Notificacao>(
      `SELECT ${COLUNAS} FROM notificacoes ${where} ORDER BY created_at DESC, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
  ]);
  return { rows: rowsResult.rows, total: parseInt(totalResult.rows[0].total, 10) };
}

export async function marcarLida(id: number, usuarioId: number): Promise<Notificacao> {
  const result = await query<Notificacao>(
    `UPDATE notificacoes SET lida = TRUE
     WHERE id = $1 AND (usuario_id IS NULL OR usuario_id = $2)
     RETURNING ${COLUNAS}`,
    [id, usuarioId]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Notificação não encontrada');
  }
  return result.rows[0];
}
