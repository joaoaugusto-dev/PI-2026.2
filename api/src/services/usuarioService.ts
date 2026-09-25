import { query } from '../config/database.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';

export interface Usuario {
  id: number;
  nome: string;
  matricula: string;
  papel: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// Nome e matrícula vivem em colaboradores; usuarios é só a conta de acesso.
const SELECT_USUARIO = `SELECT u.id, c.nome, c.matricula, u.papel, u.ativo, u.created_at, u.updated_at
     FROM usuarios u
     JOIN colaboradores c ON c.id = u.colaborador_id`;

export interface ListarUsuariosParams {
  offset: number;
  limit: number;
  ativo?: boolean;
}

export async function listarUsuarios({
  offset,
  limit,
  ativo,
}: ListarUsuariosParams): Promise<{ rows: Usuario[]; total: number }> {
  const condicoes: string[] = [];
  const params: any[] = [];

  if (ativo !== undefined) {
    params.push(ativo);
    condicoes.push(`u.ativo = $${params.length}`);
  }

  const whereSql = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

  const countResult = await query<{ total: string }>(`SELECT COUNT(*) AS total FROM usuarios u ${whereSql}`, params);
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query<Usuario>(
    `${SELECT_USUARIO}
     ${whereSql}
     ORDER BY u.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return { rows: dataResult.rows, total };
}

export async function buscarUsuarioPorId(id: number): Promise<Usuario> {
  const result = await query<Usuario>(`${SELECT_USUARIO} WHERE u.id = $1`, [id]);
  if (result.rows.length === 0) {
    throw new NotFoundError('Usuário não encontrado', 'USUARIO_NOT_FOUND');
  }
  return result.rows[0];
}

export async function ativarUsuario(id: number): Promise<Usuario> {
  const usuario = await buscarUsuarioPorId(id);

  if (usuario.ativo) {
    throw new ConflictError('Usuário já está ativo', 'USUARIO_JA_ATIVO');
  }

  await query('UPDATE usuarios SET ativo = true, updated_at = NOW() WHERE id = $1', [id]);
  return buscarUsuarioPorId(id);
}
