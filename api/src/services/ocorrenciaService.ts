import { getClient, query } from '../config/database.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';
import { AtualizarOcorrenciaInput } from '../validators/ocorrenciaValidator.js';

export interface Ocorrencia {
  id: number;
  emprestimo_id: number | null;
  ferramenta_id: number;
  ferramenta_nome: string;
  item_kit_id: number | null;
  item_kit_nome: string | null;
  colaborador_id: number | null;
  colaborador_nome: string | null;
  colaborador_matricula: string | null;
  tipo: string;
  descricao: string;
  status: 'aberta' | 'em_reparo' | 'cobrada' | 'resolvida' | 'baixada';
  custo_estimado: string | null;
  custo_real: string | null;
  data_resolucao: string | null;
  observacoes_resolucao: string | null;
  registrada_por: number;
  registrada_por_nome: string;
  resolvida_por: number | null;
  resolvida_por_nome: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListarOcorrenciasParams {
  offset: number;
  limit: number;
  status?: string;
  colaboradorId?: number;
  tipo?: string;
}

const COLUNAS_OCORRENCIA = `
  o.id, o.emprestimo_id, o.ferramenta_id, f.nome AS ferramenta_nome,
  o.item_kit_id, ik.nome AS item_kit_nome,
  o.colaborador_id, c.nome AS colaborador_nome, c.matricula AS colaborador_matricula,
  o.tipo, o.descricao, o.status, o.custo_estimado, o.custo_real,
  o.data_resolucao, o.observacoes_resolucao,
  o.registrada_por, cur.nome AS registrada_por_nome,
  o.resolvida_por, cus.nome AS resolvida_por_nome,
  o.created_at, o.updated_at
`;

// usuarios não tem mais nome/email (migration 0004): a conta liga a um
// colaborador por colaborador_id, e é de lá que vem o nome — mesmo padrão
// usado em vw_emprestimos_detalhe para usuario_retirada_nome/usuario_devolucao_nome.
const JOINS_OCORRENCIA = `
  FROM ocorrencias o
  JOIN ferramentas f ON f.id = o.ferramenta_id
  LEFT JOIN itens_kit ik ON ik.id = o.item_kit_id
  LEFT JOIN colaboradores c ON c.id = o.colaborador_id
  JOIN usuarios ur ON ur.id = o.registrada_por
  JOIN colaboradores cur ON cur.id = ur.colaborador_id
  LEFT JOIN usuarios us ON us.id = o.resolvida_por
  LEFT JOIN colaboradores cus ON cus.id = us.colaborador_id
`;

// Ordem para a regra "sem retrocesso" do PATCH: uma vez que a ocorrência avança
// para um status de rank maior, não volta para um de rank menor. cobrada fica
// entre em_reparo e resolvida (cobra o custo do colaborador antes de fechar);
// baixada é o estado final (ferramenta baixada em definitivo), podendo vir
// depois de resolvida. Decisão do time em 29/09/2026 (issue API-13).
const RANK_STATUS: Record<Ocorrencia['status'], number> = {
  aberta: 0,
  em_reparo: 1,
  cobrada: 2,
  resolvida: 3,
  baixada: 4,
};

/**
 * GET /v1/ocorrencias — filtros opcionais status, colaborador_id, tipo. Sem
 * filtro de "ativo": ocorrência não tem soft delete, e o histórico completo
 * (inclusive resolvidas) é o ponto do relatório de tratativas.
 */
export async function listar({
  offset,
  limit,
  status,
  colaboradorId,
  tipo,
}: ListarOcorrenciasParams): Promise<{ rows: Ocorrencia[]; total: number }> {
  const condicoes: string[] = [];
  const params: any[] = [];

  if (status) {
    params.push(status);
    condicoes.push(`o.status = $${params.length}`);
  }
  if (colaboradorId) {
    params.push(colaboradorId);
    condicoes.push(`o.colaborador_id = $${params.length}`);
  }
  if (tipo) {
    params.push(tipo);
    condicoes.push(`o.tipo = $${params.length}`);
  }

  const where = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

  const totalResult = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total ${JOINS_OCORRENCIA} ${where}`,
    params
  );

  params.push(limit, offset);
  const rowsResult = await query<Ocorrencia>(
    `SELECT ${COLUNAS_OCORRENCIA}
     ${JOINS_OCORRENCIA}
     ${where}
     ORDER BY o.created_at DESC, o.id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: rowsResult.rows, total: parseInt(totalResult.rows[0].total, 10) };
}

/**
 * PATCH /v1/ocorrencias/:id — fecha a tratativa de avaria/perda. resolvida_por
 * e data_resolucao nunca vêm do corpo (Regra 6): são preenchidos aqui a partir
 * do usuarioId do JWT só quando o status de destino é 'resolvida'. A regra de
 * "sem retrocesso" usa o rank de RANK_STATUS; tentar mandar a ocorrência para
 * um status de rank menor que o atual devolve 409.
 *
 * A linha fica travada (FOR UPDATE) até o COMMIT para que dois PATCHs
 * simultâneos na mesma ocorrência não apliquem transições conflitantes.
 */
export interface OcorrenciaAtualizada extends Ocorrencia {
  // "Se sobrar tempo" da issue API-13: ao resolver, sugere (sem forçar) que o
  // front chame PATCH /v1/ferramentas/:id/disponibilizar. Só vem preenchido
  // quando esta chamada foi a que resolveu a ocorrência agora e a ferramenta
  // ainda está indisponível (pode já ter sido disponibilizada por outra via,
  // ex. outra ocorrência da mesma ferramenta resolvida antes).
  sugestao_disponibilizar_ferramenta_id: number | null;
}

// Etapas do "avançar tratativa": cada chamada anda um passo. 'baixada' fica de
// fora de propósito (é decisão explícita sobre a ferramenta, não um passo).
const PROXIMA_ETAPA: Partial<Record<Ocorrencia['status'], Ocorrencia['status']>> = {
  aberta: 'em_reparo',
  em_reparo: 'cobrada',
  cobrada: 'resolvida',
};

/**
 * PATCH /v1/ocorrencias/:id/avancar — anda uma etapa (aberta → em_reparo →
 * cobrada → resolvida). A etapa de destino é calculada aqui, já com a linha
 * travada, então dois cliques seguidos não pulam duas etapas.
 */
export function avancar(id: number, usuarioId: number): Promise<OcorrenciaAtualizada> {
  return atualizar(id, {}, usuarioId, true);
}

export async function atualizar(
  id: number,
  dados: AtualizarOcorrenciaInput,
  usuarioId: number,
  avancarEtapa = false
): Promise<OcorrenciaAtualizada> {
  const client = await getClient();
  let resolvendoAgora = false;
  try {
    await client.query('BEGIN');

    const atual = await client.query<{ status: Ocorrencia['status'] }>(
      'SELECT status FROM ocorrencias WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (!atual.rows[0]) {
      throw new NotFoundError('Ocorrência não encontrada', 'OCORRENCIA_NOT_FOUND');
    }

    const statusAtual = atual.rows[0].status;
    if (avancarEtapa) {
      const proxima = PROXIMA_ETAPA[statusAtual];
      if (!proxima) {
        throw new ConflictError(
          `Tratativa já finalizada (status '${statusAtual}'), não há próxima etapa`,
          'OCORRENCIA_TRANSICAO_INVALIDA'
        );
      }
      dados = { ...dados, status: proxima };
    }
    if (dados.status && RANK_STATUS[dados.status] < RANK_STATUS[statusAtual]) {
      throw new ConflictError(
        `Não é possível retroceder de '${statusAtual}' para '${dados.status}'`,
        'OCORRENCIA_TRANSICAO_INVALIDA'
      );
    }

    // Só grava resolvida_por/data_resolucao na transição de entrada (status
    // atual ainda não era 'resolvida'). Reenviar status: 'resolvida' numa
    // ocorrência já resolvida (ex.: PATCH só para ajustar custoEstimado) não
    // sobrescreve quem/quando resolveu originalmente.
    resolvendoAgora = dados.status === 'resolvida' && statusAtual !== 'resolvida';

    await client.query(
      `UPDATE ocorrencias
       SET status = COALESCE($2, status),
           custo_estimado = COALESCE($3, custo_estimado),
           observacoes_resolucao = COALESCE($4, observacoes_resolucao),
           resolvida_por = CASE WHEN $5 THEN $6 ELSE resolvida_por END,
           data_resolucao = CASE WHEN $5 THEN NOW() ELSE data_resolucao END,
           updated_at = NOW()
       WHERE id = $1`,
      [id, dados.status ?? null, dados.custoEstimado ?? null, dados.observacoesResolucao ?? null, resolvendoAgora, usuarioId]
    );

    const result = await client.query<Ocorrencia>(
      `SELECT ${COLUNAS_OCORRENCIA} ${JOINS_OCORRENCIA} WHERE o.id = $1`,
      [id]
    );
    const ocorrencia = result.rows[0];

    let sugestaoDisponibilizarFerramentaId: number | null = null;
    if (resolvendoAgora) {
      const ferramenta = await client.query<{ status: string }>(
        'SELECT status FROM ferramentas WHERE id = $1',
        [ocorrencia.ferramenta_id]
      );
      if (ferramenta.rows[0]?.status === 'indisponivel') {
        sugestaoDisponibilizarFerramentaId = ocorrencia.ferramenta_id;
      }
    }

    await client.query('COMMIT');

    return { ...ocorrencia, sugestao_disponibilizar_ferramenta_id: sugestaoDisponibilizarFerramentaId };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
