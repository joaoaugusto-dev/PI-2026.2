import { query } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';
import {
  CriarSetorInput,
  AtualizarSetorInput,
  CriarCategoriaInput,
  AtualizarCategoriaInput,
  CriarAtividadeInput,
  AtualizarAtividadeInput,
} from '../validators/auxiliaresValidator.js';

export interface Setor {
  id: number;
  nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Categoria {
  id: number;
  nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Atividade {
  id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListarParams {
  offset: number;
  limit: number;
  q?: string;
  incluirInativos?: boolean;
  sort?: 'nome' | 'id' | 'created_at';
  order?: 'asc' | 'desc' | 'ASC' | 'DESC';
}

export interface OpcoesCombinadas {
  setores: Array<{ id: number; nome: string }>;
  categorias: Array<{ id: number; nome: string }>;
  atividades: Array<{ id: number; nome: string; descricao: string | null }>;
}

function escaparCoringasLike(valor: string): string {
  return valor.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// ============================================================================
// SETORES
// ============================================================================

export async function listarSetores({
  offset,
  limit,
  q,
  incluirInativos = false,
  sort = 'nome',
  order,
}: ListarParams): Promise<{ rows: Setor[]; total: number }> {
  const condicoes: string[] = [];
  const params: any[] = [];

  if (!incluirInativos) {
    condicoes.push('ativo = true');
  }

  if (q) {
    params.push(`%${escaparCoringasLike(q)}%`);
    condicoes.push(`nome ILIKE $${params.length}`);
  }

  const whereSql = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

  const colunaOrdenacao = sort === 'id' ? 'id' : sort === 'created_at' ? 'created_at' : 'nome';
  const direcaoPadrao = sort === 'id' || sort === 'created_at' ? 'DESC' : 'ASC';
  const direcao = order ? order.toUpperCase() : direcaoPadrao;

  const countSql = `SELECT COUNT(*) AS total FROM setores ${whereSql}`;
  const countResult = await query<{ total: string }>(countSql, params);
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataSql = `
    SELECT id, nome, ativo, created_at, updated_at
    FROM setores
    ${whereSql}
    ORDER BY ${colunaOrdenacao} ${direcao}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const dataResult = await query<Setor>(dataSql, [...params, limit, offset]);

  return { rows: dataResult.rows, total };
}

export async function buscarSetorPorId(id: number): Promise<Setor> {
  const result = await query<Setor>(
    'SELECT id, nome, ativo, created_at, updated_at FROM setores WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Setor não encontrado');
  }
  return result.rows[0];
}

export async function criarSetor(dados: CriarSetorInput): Promise<Setor> {
  const result = await query<Setor>(
    `INSERT INTO setores (nome, ativo, created_at, updated_at)
     VALUES ($1, true, NOW(), NOW())
     RETURNING id, nome, ativo, created_at, updated_at`,
    [dados.nome]
  );
  return result.rows[0];
}

export async function atualizarSetor(id: number, dados: AtualizarSetorInput): Promise<Setor> {
  await buscarSetorPorId(id);

  const updates: string[] = ['updated_at = NOW()'];
  const params: any[] = [id];

  if (dados.nome !== undefined) {
    params.push(dados.nome);
    updates.push(`nome = $${params.length}`);
  }

  if (dados.ativo !== undefined) {
    params.push(dados.ativo);
    updates.push(`ativo = $${params.length}`);
  }

  const sql = `
    UPDATE setores
    SET ${updates.join(', ')}
    WHERE id = $1
    RETURNING id, nome, ativo, created_at, updated_at
  `;

  const result = await query<Setor>(sql, params);
  return result.rows[0];
}

export async function excluirSetor(id: number): Promise<Setor> {
  await buscarSetorPorId(id);

  const result = await query<Setor>(
    `UPDATE setores
     SET ativo = false, updated_at = NOW()
     WHERE id = $1
     RETURNING id, nome, ativo, created_at, updated_at`,
    [id]
  );
  return result.rows[0];
}

// ============================================================================
// CATEGORIAS (GRUPOS DE FERRAMENTAS)
// ============================================================================

export async function listarCategorias({
  offset,
  limit,
  q,
  incluirInativos = false,
  sort = 'nome',
  order,
}: ListarParams): Promise<{ rows: Categoria[]; total: number }> {
  const condicoes: string[] = [];
  const params: any[] = [];

  if (!incluirInativos) {
    condicoes.push('ativo = true');
  }

  if (q) {
    params.push(`%${escaparCoringasLike(q)}%`);
    condicoes.push(`nome ILIKE $${params.length}`);
  }

  const whereSql = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

  const colunaOrdenacao = sort === 'id' ? 'id' : sort === 'created_at' ? 'created_at' : 'nome';
  const direcaoPadrao = sort === 'id' || sort === 'created_at' ? 'DESC' : 'ASC';
  const direcao = order ? order.toUpperCase() : direcaoPadrao;

  const countSql = `SELECT COUNT(*) AS total FROM grupos_ferramentas ${whereSql}`;
  const countResult = await query<{ total: string }>(countSql, params);
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataSql = `
    SELECT id, nome, ativo, created_at, updated_at
    FROM grupos_ferramentas
    ${whereSql}
    ORDER BY ${colunaOrdenacao} ${direcao}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const dataResult = await query<Categoria>(dataSql, [...params, limit, offset]);

  return { rows: dataResult.rows, total };
}

export async function buscarCategoriaPorId(id: number): Promise<Categoria> {
  const result = await query<Categoria>(
    'SELECT id, nome, ativo, created_at, updated_at FROM grupos_ferramentas WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Categoria não encontrada');
  }
  return result.rows[0];
}

export async function criarCategoria(dados: CriarCategoriaInput): Promise<Categoria> {
  const result = await query<Categoria>(
    `INSERT INTO grupos_ferramentas (nome, ativo, created_at, updated_at)
     VALUES ($1, true, NOW(), NOW())
     RETURNING id, nome, ativo, created_at, updated_at`,
    [dados.nome]
  );
  return result.rows[0];
}

export async function atualizarCategoria(id: number, dados: AtualizarCategoriaInput): Promise<Categoria> {
  await buscarCategoriaPorId(id);

  const updates: string[] = ['updated_at = NOW()'];
  const params: any[] = [id];

  if (dados.nome !== undefined) {
    params.push(dados.nome);
    updates.push(`nome = $${params.length}`);
  }

  if (dados.ativo !== undefined) {
    params.push(dados.ativo);
    updates.push(`ativo = $${params.length}`);
  }

  const sql = `
    UPDATE grupos_ferramentas
    SET ${updates.join(', ')}
    WHERE id = $1
    RETURNING id, nome, ativo, created_at, updated_at
  `;

  const result = await query<Categoria>(sql, params);
  return result.rows[0];
}

export async function excluirCategoria(id: number): Promise<Categoria> {
  await buscarCategoriaPorId(id);

  const result = await query<Categoria>(
    `UPDATE grupos_ferramentas
     SET ativo = false, updated_at = NOW()
     WHERE id = $1
     RETURNING id, nome, ativo, created_at, updated_at`,
    [id]
  );
  return result.rows[0];
}

// ============================================================================
// ATIVIDADES
// ============================================================================

export async function listarAtividades({
  offset,
  limit,
  q,
  incluirInativos = false,
  sort = 'nome',
  order,
}: ListarParams): Promise<{ rows: Atividade[]; total: number }> {
  const condicoes: string[] = [];
  const params: any[] = [];

  if (!incluirInativos) {
    condicoes.push('ativo = true');
  }

  if (q) {
    params.push(`%${escaparCoringasLike(q)}%`);
    condicoes.push(`(nome ILIKE $${params.length} OR descricao ILIKE $${params.length})`);
  }

  const whereSql = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

  const colunaOrdenacao = sort === 'id' ? 'id' : sort === 'created_at' ? 'created_at' : 'nome';
  const direcaoPadrao = sort === 'id' || sort === 'created_at' ? 'DESC' : 'ASC';
  const direcao = order ? order.toUpperCase() : direcaoPadrao;

  const countSql = `SELECT COUNT(*) AS total FROM atividades ${whereSql}`;
  const countResult = await query<{ total: string }>(countSql, params);
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataSql = `
    SELECT id, nome, descricao, ativo, created_at, updated_at
    FROM atividades
    ${whereSql}
    ORDER BY ${colunaOrdenacao} ${direcao}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const dataResult = await query<Atividade>(dataSql, [...params, limit, offset]);

  return { rows: dataResult.rows, total };
}

export async function buscarAtividadePorId(id: number): Promise<Atividade> {
  const result = await query<Atividade>(
    'SELECT id, nome, descricao, ativo, created_at, updated_at FROM atividades WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Atividade não encontrada');
  }
  return result.rows[0];
}

export async function criarAtividade(dados: CriarAtividadeInput): Promise<Atividade> {
  const result = await query<Atividade>(
    `INSERT INTO atividades (nome, descricao, ativo, created_at, updated_at)
     VALUES ($1, $2, true, NOW(), NOW())
     RETURNING id, nome, descricao, ativo, created_at, updated_at`,
    [dados.nome, dados.descricao ?? null]
  );
  return result.rows[0];
}

export async function atualizarAtividade(id: number, dados: AtualizarAtividadeInput): Promise<Atividade> {
  await buscarAtividadePorId(id);

  const updates: string[] = ['updated_at = NOW()'];
  const params: any[] = [id];

  if (dados.nome !== undefined) {
    params.push(dados.nome);
    updates.push(`nome = $${params.length}`);
  }

  if (dados.descricao !== undefined) {
    params.push(dados.descricao);
    updates.push(`descricao = $${params.length}`);
  }

  if (dados.ativo !== undefined) {
    params.push(dados.ativo);
    updates.push(`ativo = $${params.length}`);
  }

  const sql = `
    UPDATE atividades
    SET ${updates.join(', ')}
    WHERE id = $1
    RETURNING id, nome, descricao, ativo, created_at, updated_at
  `;

  const result = await query<Atividade>(sql, params);
  return result.rows[0];
}

export async function excluirAtividade(id: number): Promise<Atividade> {
  await buscarAtividadePorId(id);

  const result = await query<Atividade>(
    `UPDATE atividades
     SET ativo = false, updated_at = NOW()
     WHERE id = $1
     RETURNING id, nome, descricao, ativo, created_at, updated_at`,
    [id]
  );
  return result.rows[0];
}

// ============================================================================
// OPÇÕES COMBINADAS (GET /v1/opcoes)
// ============================================================================

export async function obterOpcoesCombinadas(): Promise<OpcoesCombinadas> {
  const [setoresRes, categoriasRes, atividadesRes] = await Promise.all([
    query<{ id: number; nome: string }>('SELECT id, nome FROM setores WHERE ativo = true ORDER BY nome ASC'),
    query<{ id: number; nome: string }>('SELECT id, nome FROM grupos_ferramentas WHERE ativo = true ORDER BY nome ASC'),
    query<{ id: number; nome: string; descricao: string | null }>(
      'SELECT id, nome, descricao FROM atividades WHERE ativo = true ORDER BY nome ASC'
    ),
  ]);

  return {
    setores: setoresRes.rows,
    categorias: categoriasRes.rows,
    atividades: atividadesRes.rows,
  };
}
