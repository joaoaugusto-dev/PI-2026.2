import { query } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';
import { CriarFerramentaInput, EditarFerramentaInput } from '../validators/ferramentaValidator.js';

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
  valor_aquisicao?: number | null;
  eh_kit?: boolean;
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

// Escapa os coringas do ILIKE (%, _ e a própria barra invertida) para que
// caracteres digitados pelo usuário em "q" sejam tratados como texto literal,
// não como padrão de busca.
function escaparCoringasLike(valor: string): string {
  return valor.replace(/[\\%_]/g, (char) => `\\${char}`);
}

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
    params.push(`%${escaparCoringasLike(q)}%`);
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
            subgrupo_id, setor_id, localizacao, status, valor_aquisicao, eh_kit, ativo, created_at
     FROM ferramentas
     ${where}
     ORDER BY ${ordenacao}, id
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: rowsResult.rows, total: parseInt(totalResult.rows[0].total, 10) };
}

export async function buscarPorId(id: number): Promise<Ferramenta> {
  const result = await query<Ferramenta>(
    `SELECT id, nome, descricao, marca, modelo, codigo_identificacao, grupo_id,
            subgrupo_id, setor_id, localizacao, status, valor_aquisicao, eh_kit, ativo, created_at
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
            subgrupo_id, setor_id, localizacao, status, valor_aquisicao, eh_kit, ativo, created_at
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
    `INSERT INTO ferramentas (nome, descricao, marca, modelo, grupo_id, subgrupo_id, setor_id, localizacao, valor_aquisicao, eh_kit)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, nome, descricao, marca, modelo, codigo_identificacao, grupo_id,
               subgrupo_id, setor_id, localizacao, status, valor_aquisicao, eh_kit, ativo, created_at`,
    [
      input.nome,
      input.descricao ?? null,
      input.marca ?? null,
      input.modelo ?? null,
      input.grupoId,
      input.subgrupoId ?? null,
      input.setorId ?? null,
      input.localizacao ?? null,
      input.valorAquisicao ?? null,
      input.ehKit ?? false,
    ]
  );

  return result.rows[0];
}

export async function atualizar(id: number, input: EditarFerramentaInput): Promise<Ferramenta> {
  await buscarPorId(id);

  const campos: string[] = [];
  const params: any[] = [];

  if (input.nome !== undefined) {
    params.push(input.nome);
    campos.push(`nome = $${params.length}`);
  }
  if (input.descricao !== undefined) {
    params.push(input.descricao);
    campos.push(`descricao = $${params.length}`);
  }
  if (input.marca !== undefined) {
    params.push(input.marca);
    campos.push(`marca = $${params.length}`);
  }
  if (input.modelo !== undefined) {
    params.push(input.modelo);
    campos.push(`modelo = $${params.length}`);
  }
  if (input.grupoId !== undefined) {
    params.push(input.grupoId);
    campos.push(`grupo_id = $${params.length}`);
  }
  if (input.subgrupoId !== undefined) {
    params.push(input.subgrupoId);
    campos.push(`subgrupo_id = $${params.length}`);
  }
  if (input.setorId !== undefined) {
    params.push(input.setorId);
    campos.push(`setor_id = $${params.length}`);
  }
  if (input.localizacao !== undefined) {
    params.push(input.localizacao);
    campos.push(`localizacao = $${params.length}`);
  }
  if (input.valorAquisicao !== undefined) {
    params.push(input.valorAquisicao);
    campos.push(`valor_aquisicao = $${params.length}`);
  }
  if (input.ehKit !== undefined) {
    params.push(input.ehKit);
    campos.push(`eh_kit = $${params.length}`);
  }
  if (input.status !== undefined) {
    params.push(input.status);
    campos.push(`status = $${params.length}`);
  }

  if (campos.length === 0) {
    return buscarPorId(id);
  }

  campos.push(`updated_at = NOW()`);
  params.push(id);

  const result = await query<Ferramenta>(
    `UPDATE ferramentas
     SET ${campos.join(', ')}
     WHERE id = $${params.length} AND ativo = true
     RETURNING id, nome, descricao, marca, modelo, codigo_identificacao, grupo_id,
               subgrupo_id, setor_id, localizacao, status, valor_aquisicao, eh_kit, ativo, created_at`,
    params
  );

  return result.rows[0];
}

