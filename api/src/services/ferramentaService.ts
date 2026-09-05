import { query } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';
import { CriarFerramentaInput } from '../validators/ferramentaValidator.js';

export interface Ferramenta {
  id: number;
  nome: string;
  descricao: string | null;
  marca: string | null;
  modelo: string | null;
  codigo_identificacao: number | null;
  grupo_id: number;
  subgrupo_id: number | null;
  setor_id: number | null;
  localizacao: string | null;
  status: 'disponivel' | 'em_uso' | 'indisponivel';
  ativo: boolean;
  created_at: string;
}

export interface ListarFerramentasParams {
  offset: number;
  limit: number;
  status?: string;
}

/**
 * Consulta básica com paginação e filtro opcional de status — só lista
 * ferramentas ativas (Regra 2 do CLAUDE.md: disponível/em_uso/indisponível
 * nunca aparecem misturadas com ferramentas baixadas).
 */
export async function listar({ offset, limit, status }: ListarFerramentasParams): Promise<{ rows: Ferramenta[]; total: number }> {
  const condicoes = ['ativo = true'];
  const params: any[] = [];

  if (status) {
    params.push(status);
    condicoes.push(`status = $${params.length}`);
  }

  const where = `WHERE ${condicoes.join(' AND ')}`;

  const totalResult = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM ferramentas ${where}`,
    params
  );

  params.push(limit, offset);
  const rowsResult = await query<Ferramenta>(
    `SELECT id, nome, descricao, marca, modelo, codigo_identificacao, grupo_id,
            subgrupo_id, setor_id, localizacao, status, ativo, created_at
     FROM ferramentas
     ${where}
     ORDER BY nome
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: rowsResult.rows, total: parseInt(totalResult.rows[0].total, 10) };
}

export async function buscarPorId(id: number): Promise<Ferramenta> {
  const result = await query<Ferramenta>(
    `SELECT id, nome, descricao, marca, modelo, codigo_identificacao, grupo_id,
            subgrupo_id, setor_id, localizacao, status, ativo, created_at
     FROM ferramentas
     WHERE id = $1 AND ativo = true`,
    [id]
  );

  const ferramenta = result.rows[0];
  if (!ferramenta) {
    throw new NotFoundError('Ferramenta não encontrada', 'FERRAMENTA_NOT_FOUND');
  }

  return ferramenta;
}

export async function criar(input: CriarFerramentaInput): Promise<Ferramenta> {
  const result = await query<Ferramenta>(
    `INSERT INTO ferramentas (nome, descricao, marca, modelo, grupo_id, subgrupo_id, setor_id, localizacao)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, nome, descricao, marca, modelo, codigo_identificacao, grupo_id,
               subgrupo_id, setor_id, localizacao, status, ativo, created_at`,
    [
      input.nome,
      input.descricao ?? null,
      input.marca ?? null,
      input.modelo ?? null,
      input.grupoId,
      input.subgrupoId ?? null,
      input.setorId ?? null,
      input.localizacao ?? null,
    ]
  );

  return result.rows[0];
}
