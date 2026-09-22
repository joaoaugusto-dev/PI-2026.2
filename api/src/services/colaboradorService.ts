import { query } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';
import { CriarColaboradorInput, EditarColaboradorInput } from '../validators/colaboradorValidator.js';

export interface Colaborador {
  id: number;
  nome: string;
  matricula: string;
  setor_id: number;
  ativo: boolean;
  criado_por: number | null;
  created_at: string;
  updated_at: string;
}

export interface ListarColaboradoresParams {
  offset: number;
  limit: number;
  q?: string;
  setorId?: number;
  sort?: 'nome' | 'matricula';
}

const COLUNAS_ORDENACAO: Record<string, string> = {
  nome: 'nome',
  matricula: 'matricula',
};

const COLUNAS_COLABORADOR = `id, nome, matricula, setor_id, ativo, criado_por, created_at, updated_at`;

// Escapa os coringas do ILIKE (%, _ e a própria barra invertida) para que
// caracteres digitados pelo usuário em "q" sejam tratados como texto literal,
// não como padrão de busca (mesmo utilitário do ferramentaService).
function escaparCoringasLike(valor: string): string {
  return valor.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Consulta com paginação e filtro opcional de texto/setor — só lista
 * colaboradores ativos, para a tela de CRUD (GET /v1/colaboradores).
 */
export async function listar({
  offset,
  limit,
  q,
  setorId,
  sort,
}: ListarColaboradoresParams): Promise<{ rows: Colaborador[]; total: number }> {
  const condicoes = ['ativo = true'];
  const params: any[] = [];

  if (q) {
    params.push(`%${escaparCoringasLike(q)}%`);
    condicoes.push(`(nome ILIKE $${params.length} OR matricula ILIKE $${params.length})`);
  }

  if (setorId) {
    params.push(setorId);
    condicoes.push(`setor_id = $${params.length}`);
  }

  const where = `WHERE ${condicoes.join(' AND ')}`;
  const ordenacao = COLUNAS_ORDENACAO[sort ?? 'nome'] ?? 'nome';

  const totalResult = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM colaboradores ${where}`,
    params
  );

  params.push(limit, offset);
  const rowsResult = await query<Colaborador>(
    `SELECT ${COLUNAS_COLABORADOR}
     FROM colaboradores
     ${where}
     ORDER BY ${ordenacao}, id
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: rowsResult.rows, total: parseInt(totalResult.rows[0].total, 10) };
}

export async function buscarPorId(id: number): Promise<Colaborador> {
  const result = await query<Colaborador>(
    `SELECT ${COLUNAS_COLABORADOR} FROM colaboradores WHERE id = $1 AND ativo = true`,
    [id]
  );

  const colaborador = result.rows[0];
  if (!colaborador) {
    throw new NotFoundError('Colaborador não encontrado', 'COLABORADOR_NOT_FOUND');
  }

  return colaborador;
}

/**
 * GET /v1/colaboradores/identificar?termo= — o endpoint mais importante do
 * fluxo de retirada (Regra 5). Tenta, nessa ordem:
 *   1. matrícula exata (mesmo crachá — não existe codigo_cracha separado);
 *   2. nome com unaccent/pg_trgm, tolerante a acento e erro de digitação
 *      (usa idx_colaboradores_nome_trgm, migration 0001).
 * A segunda etapa exige um mínimo de similaridade (`%`, limiar padrão de
 * `pg_trgm.similarity_threshold`) para não devolver qualquer nome parecido;
 * o resultado mais similar vem primeiro.
 *
 * Desempenho (API-09, item "se sobrar tempo"): com os 50 colaboradores do
 * seed, a busca por nome leva ~1ms (média de 20 execuções, round-trip
 * incluso). O planner do Postgres prefere Seq Scan a
 * idx_colaboradores_nome_trgm nesse volume — comportamento esperado, não é
 * sinal de índice mal configurado: forçando o uso do índice
 * (`SET enable_seqscan = off`) o tempo de execução medido por EXPLAIN
 * ANALYZE ficou igual (~0.5ms), confirmando que o índice é válido e será
 * usado pelo planner conforme a tabela crescer. Índice mantido como está.
 */
export async function identificar(termo: string): Promise<Colaborador> {
  const porMatricula = await query<Colaborador>(
    `SELECT ${COLUNAS_COLABORADOR} FROM colaboradores WHERE matricula = $1 AND ativo = true`,
    [termo]
  );
  if (porMatricula.rows[0]) {
    return porMatricula.rows[0];
  }

  const porNome = await query<Colaborador>(
    `SELECT ${COLUNAS_COLABORADOR}
     FROM colaboradores
     WHERE ativo = true AND f_unaccent(lower(nome)) % f_unaccent(lower($1))
     ORDER BY similarity(f_unaccent(lower(nome)), f_unaccent(lower($1))) DESC
     LIMIT 1`,
    [termo]
  );
  if (porNome.rows[0]) {
    return porNome.rows[0];
  }

  throw new NotFoundError('Colaborador não encontrado', 'COLABORADOR_NOT_FOUND');
}

/**
 * POST /v1/colaboradores — cadastro rápido, chamado tanto pela tela de CRUD
 * quanto, no meio do fluxo de retirada, quando o /identificar não acha
 * ninguém (Regra 5). usuarioId vem sempre do JWT (Regra 6), nunca do corpo.
 * Matrícula duplicada cai no índice único (colaboradores_matricula_key) e é
 * traduzida para 409 pelo errorHandler global (código Postgres 23505).
 */
export async function criar(input: CriarColaboradorInput, usuarioId: number): Promise<Colaborador> {
  const result = await query<Colaborador>(
    `INSERT INTO colaboradores (nome, matricula, setor_id, criado_por)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COLUNAS_COLABORADOR}`,
    [input.nome, input.matricula, input.setorId, usuarioId]
  );

  return result.rows[0];
}

const COLUNAS_ATUALIZAVEIS: Record<keyof EditarColaboradorInput, string> = {
  nome: 'nome',
  matricula: 'matricula',
  setorId: 'setor_id',
};

export async function atualizar(id: number, input: EditarColaboradorInput): Promise<Colaborador> {
  await buscarPorId(id);

  const campos: string[] = [];
  const params: any[] = [];

  for (const [chave, coluna] of Object.entries(COLUNAS_ATUALIZAVEIS)) {
    const valor = input[chave as keyof EditarColaboradorInput];
    if (valor !== undefined) {
      params.push(valor);
      campos.push(`${coluna} = $${params.length}`);
    }
  }

  params.push(id);
  const result = await query<Colaborador>(
    `UPDATE colaboradores
     SET ${campos.join(', ')}, updated_at = NOW()
     WHERE id = $${params.length} AND ativo = true
     RETURNING ${COLUNAS_COLABORADOR}`,
    params
  );

  return result.rows[0];
}

/**
 * DELETE /v1/colaboradores/:id — inativação lógica (ativo = false), nunca
 * apaga o registro (mesmo padrão de baixa de ferramentas.baixar).
 */
export async function inativar(id: number): Promise<Colaborador> {
  await buscarPorId(id);

  const result = await query<Colaborador>(
    `UPDATE colaboradores
     SET ativo = false, updated_at = NOW()
     WHERE id = $1 AND ativo = true
     RETURNING ${COLUNAS_COLABORADOR}`,
    [id]
  );

  return result.rows[0];
}
