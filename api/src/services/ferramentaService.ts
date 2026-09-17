import { query, getClient } from '../config/database.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { CriarFerramentaInput, AtualizarFerramentaInput } from '../validators/ferramentaValidator.js';

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
  motivo_indisponivel: 'avaria' | 'perda' | 'manutencao_preventiva' | 'baixada' | null;
  etiqueta_impressa_em: string | null;
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

const COLUNAS_FERRAMENTA = `id, nome, descricao, marca, modelo, codigo_identificacao, grupo_id,
            subgrupo_id, setor_id, localizacao, status, motivo_indisponivel,
            etiqueta_impressa_em, ativo, created_at`;

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
    `SELECT ${COLUNAS_FERRAMENTA}
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
    `SELECT ${COLUNAS_FERRAMENTA}
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
    `SELECT ${COLUNAS_FERRAMENTA}
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
     RETURNING ${COLUNAS_FERRAMENTA}`,
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

const COLUNAS_ATUALIZAVEIS: Record<keyof AtualizarFerramentaInput, string> = {
  nome: 'nome',
  descricao: 'descricao',
  marca: 'marca',
  modelo: 'modelo',
  grupoId: 'grupo_id',
  subgrupoId: 'subgrupo_id',
  setorId: 'setor_id',
  localizacao: 'localizacao',
};

export async function atualizar(id: number, input: AtualizarFerramentaInput): Promise<Ferramenta> {
  await buscarPorId(id);

  const campos: string[] = [];
  const params: any[] = [];

  for (const [chave, coluna] of Object.entries(COLUNAS_ATUALIZAVEIS)) {
    const valor = input[chave as keyof AtualizarFerramentaInput];
    if (valor !== undefined) {
      params.push(valor);
      campos.push(`${coluna} = $${params.length}`);
    }
  }

  params.push(id);
  const result = await query<Ferramenta>(
    `UPDATE ferramentas
     SET ${campos.join(', ')}, updated_at = NOW()
     WHERE id = $${params.length} AND ativo = true
     RETURNING ${COLUNAS_FERRAMENTA}`,
    params
  );

  return result.rows[0];
}

/**
 * PATCH /v1/ferramentas/:id/etiqueta-impressa — só marca a data/hora de
 * impressão da etiqueta Code128 (FE-09/DOC-08); não afeta status.
 */
export async function marcarEtiquetaImpressa(id: number): Promise<Ferramenta> {
  await buscarPorId(id);

  const result = await query<Ferramenta>(
    `UPDATE ferramentas
     SET etiqueta_impressa_em = NOW(), updated_at = NOW()
     WHERE id = $1 AND ativo = true
     RETURNING ${COLUNAS_FERRAMENTA}`,
    [id]
  );

  return result.rows[0];
}

/**
 * PATCH /v1/ferramentas/:id/disponibilizar — ação explícita de retorno de
 * reparo (Regra de negócio: "após o reparo, a disponibilização deve ser uma
 * ação explícita e auditável"). Registra em `auditoria` e resolve qualquer
 * ocorrência ainda em aberto/em reparo/cobrada dessa ferramenta.
 */
export async function disponibilizar(id: number, usuarioId: number): Promise<Ferramenta> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const atual = await client.query<Ferramenta>(
      `SELECT ${COLUNAS_FERRAMENTA} FROM ferramentas WHERE id = $1 AND ativo = true FOR UPDATE`,
      [id]
    );
    const ferramenta = atual.rows[0];
    if (!ferramenta) {
      throw new NotFoundError('Ferramenta não encontrada', 'FERRAMENTA_NOT_FOUND');
    }
    if (ferramenta.status !== 'indisponivel') {
      throw new ConflictError(
        `Ferramenta não está indisponível (status atual: ${ferramenta.status})`,
        'FERRAMENTA_JA_DISPONIVEL'
      );
    }

    const atualizado = await client.query<Ferramenta>(
      `UPDATE ferramentas
       SET status = 'disponivel', motivo_indisponivel = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING ${COLUNAS_FERRAMENTA}`,
      [id]
    );

    await client.query(
      `INSERT INTO auditoria (tabela, operacao, registro_id, dados_anteriores, dados_novos, usuario_id)
       VALUES ('ferramentas', 'disponibilizar', $1, $2, $3, $4)`,
      [
        id,
        JSON.stringify({ status: ferramenta.status, motivo_indisponivel: ferramenta.motivo_indisponivel }),
        JSON.stringify({ status: 'disponivel', motivo_indisponivel: null }),
        usuarioId,
      ]
    );

    await client.query(
      `UPDATE ocorrencias
       SET status = 'resolvida', resolvida_por = $2, data_resolucao = NOW(), updated_at = NOW()
       WHERE ferramenta_id = $1 AND status IN ('aberta', 'em_reparo', 'cobrada')`,
      [id, usuarioId]
    );

    await client.query('COMMIT');
    return atualizado.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * DELETE /v1/ferramentas/:id — baixa lógica (ativo = false), nunca apaga de
 * verdade. Só é permitida depois que o empréstimo em aberto (se houver) for
 * finalizado — inclusive quando finalizado como avaria/perda, já que o
 * importante é não deixar `emprestimos.data_devolucao` nulo apontando para
 * uma ferramenta baixada.
 */
export async function baixar(id: number): Promise<Ferramenta> {
  await buscarPorId(id);

  const emprestimoAberto = await query(
    `SELECT 1 FROM emprestimos WHERE ferramenta_id = $1 AND data_devolucao IS NULL LIMIT 1`,
    [id]
  );
  if ((emprestimoAberto.rowCount ?? 0) > 0) {
    throw new ConflictError(
      'Ferramenta possui empréstimo em aberto — finalize a devolução (ou registre a perda/avaria) antes de dar baixa',
      'FERRAMENTA_COM_EMPRESTIMO_ABERTO'
    );
  }

  const result = await query<Ferramenta>(
    `UPDATE ferramentas
     SET ativo = false, status = 'indisponivel', motivo_indisponivel = 'baixada', updated_at = NOW()
     WHERE id = $1 AND ativo = true
     RETURNING ${COLUNAS_FERRAMENTA}`,
    [id]
  );

  return result.rows[0];
}
