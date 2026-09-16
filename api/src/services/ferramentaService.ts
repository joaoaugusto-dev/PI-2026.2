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
  q?: string;
  status?: string;
  grupoId?: number;
  sort?: 'nome' | 'status';
}

const COLUNAS_ORDENACAO: Record<string, string> = {
  nome: 'nome',
  status: 'status',
};

/**
 * Consulta com paginação e filtros opcionais (busca textual, status, grupo) —
 * só lista ferramentas ativas (Regra 2 do CLAUDE.md: disponível/em_uso/indisponível
 * nunca aparecem misturadas com ferramentas baixadas).
 */
export async function listar({
  offset,
  limit,
  q,
  status,
  grupoId,
  sort,
}: ListarFerramentasParams): Promise<{ rows: Ferramenta[]; total: number }> {
  const condicoes = ['ativo = true'];
  const params: any[] = [];

  if (q) {
    params.push(`%${q}%`);
    condicoes.push(
      `(nome ILIKE $${params.length} OR descricao ILIKE $${params.length} OR marca ILIKE $${params.length} OR modelo ILIKE $${params.length})`
    );
  }

  if (status) {
    params.push(status);
    condicoes.push(`status = $${params.length}`);
  }

  if (grupoId) {
    params.push(grupoId);
    condicoes.push(`grupo_id = $${params.length}`);
  }

  const where = `WHERE ${condicoes.join(' AND ')}`;
  const ordenacao = COLUNAS_ORDENACAO[sort ?? 'nome'] ?? 'nome';

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
     ORDER BY ${ordenacao}
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

export async function buscarPorCodigo(codigo: number): Promise<Ferramenta> {
  const result = await query<Ferramenta>(
    `SELECT id, nome, descricao, marca, modelo, codigo_identificacao, grupo_id,
            subgrupo_id, setor_id, localizacao, status, ativo, created_at
     FROM ferramentas
     WHERE codigo_identificacao = $1 AND ativo = true`,
    [codigo]
  );

  const ferramenta = result.rows[0];
  if (!ferramenta) {
    throw new NotFoundError('Ferramenta não encontrada', 'FERRAMENTA_NOT_FOUND');
  }

  return ferramenta;
}

export interface HistoricoFerramenta {
  emprestimos: any[];
  ocorrencias: any[];
}

/**
 * Junta empréstimos (via vw_emprestimos_detalhe, já com nomes resolvidos) e
 * ocorrências da ferramenta, mais recentes primeiro.
 */
export async function historico(id: number): Promise<HistoricoFerramenta> {
  // reaproveita buscarPorId só para validar que a ferramenta existe/está ativa
  await buscarPorId(id);

  const [emprestimosResult, ocorrenciasResult] = await Promise.all([
    query(
      `SELECT * FROM vw_emprestimos_detalhe WHERE ferramenta_id = $1 ORDER BY data_retirada DESC`,
      [id]
    ),
    query(
      `SELECT id, emprestimo_id, item_kit_id, colaborador_id, tipo, descricao, status,
              custo_estimado, custo_real, data_resolucao, observacoes_resolucao,
              registrada_por, resolvida_por, created_at, updated_at
       FROM ocorrencias
       WHERE ferramenta_id = $1
       ORDER BY created_at DESC`,
      [id]
    ),
  ]);

  return { emprestimos: emprestimosResult.rows, ocorrencias: ocorrenciasResult.rows };
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
