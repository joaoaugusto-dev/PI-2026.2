import { getClient, query } from '../config/database.js';
import { AppError, ConflictError, NotFoundError } from '../utils/errors.js';
import { CriarEmprestimoInput } from '../validators/emprestimoValidator.js';
import { adicionarDiasUteis } from './feriadoService.js';

export interface Emprestimo {
  id: number;
  data_retirada: string;
  previsao_devolucao: string;
  data_devolucao: string | null;
  situacao: 'em_aberto' | 'atrasado' | 'devolvido';
  ferramenta_id: number;
  ferramenta_nome: string;
  codigo_identificacao: number | null;
  eh_kit: boolean;
  item_kit_id: number | null;
  item_kit_nome: string | null;
  colaborador_id: number;
  colaborador_nome: string;
  colaborador_matricula: string;
  setor_id: number;
  setor_nome: string;
  atividade_id: number | null;
  atividade_nome: string | null;
  atividade_observacao: string | null;
  ordem_servico: string | null;
  observacoes_retirada: string | null;
  usuario_retirada_nome: string;
}

// Confere que o registro existe e está ativo antes do INSERT, para responder
// 404 com o código do recurso em vez de deixar a FK do banco devolver um 400
// genérico (e para não aceitar registros inativos, que a FK não barra).
async function garantirAtivo(tabela: string, id: number, mensagem: string, codigo: string): Promise<void> {
  const result = await query(`SELECT 1 FROM ${tabela} WHERE id = $1 AND ativo = true`, [id]);
  if (result.rowCount === 0) {
    throw new NotFoundError(mensagem, codigo);
  }
}

async function validarItemKit(ferramentaId: number, itemKitId: number): Promise<void> {
  const item = await query<{ ferramenta_id: number; eh_kit: boolean }>(
    `SELECT ik.ferramenta_id, f.eh_kit
     FROM itens_kit ik
     JOIN ferramentas f ON f.id = ik.ferramenta_id
     WHERE ik.id = $1 AND ik.ativo = true`,
    [itemKitId]
  );

  if (!item.rows[0]) {
    throw new NotFoundError('Item do kit não encontrado', 'ITEM_KIT_NOT_FOUND');
  }
  if (item.rows[0].ferramenta_id !== ferramentaId || !item.rows[0].eh_kit) {
    throw new AppError('O item informado não pertence à ferramenta', 400, 'ITEM_KIT_INVALIDO');
  }
}

// Erros de regra que o banco levanta no INSERT: trigger fn_valida_retirada
// e fn_valida_kit_exclusividade (P0001) e índice único uq_emprestimo_aberto
// (23505). Todos significam "essa ferramenta/peça não pode sair agora".
function traduzirErroDeRetirada(error: any): never {
  if (error?.code === 'P0001') {
    throw new ConflictError(error.message, 'FERRAMENTA_INDISPONIVEL');
  }
  if (error?.code === '23505' && error?.constraint === 'uq_emprestimo_aberto') {
    throw new ConflictError('A ferramenta já possui um empréstimo em aberto', 'FERRAMENTA_INDISPONIVEL');
  }
  throw error;
}

/**
 * POST /v1/emprestimos — registra a retirada. usuarioId vem sempre do JWT
 * (Regra 6), nunca do corpo. Quem barra ferramenta indisponível continua
 * sendo o banco (trigger fn_valida_retirada, fn_valida_kit_exclusividade e o
 * índice uq_emprestimo_aberto); aqui só se traduz o erro para 409.
 *
 * O INSERT roda numa transação que trava a linha da ferramenta (FOR UPDATE):
 * a exclusividade entre "kit inteiro" e "peça avulsa" é decidida por um COUNT
 * dentro da trigger, que sob READ COMMITTED não enxerga uma retirada ainda não
 * confirmada, e o índice único não cobre essa combinação (chaves diferentes).
 * Com a trava, retiradas simultâneas da mesma ferramenta acontecem uma de
 * cada vez.
 */
export async function criar(input: CriarEmprestimoInput, usuarioId: number): Promise<Emprestimo> {
  await garantirAtivo('ferramentas', input.ferramentaId, 'Ferramenta não encontrada', 'FERRAMENTA_NOT_FOUND');
  await garantirAtivo('colaboradores', input.colaboradorId, 'Colaborador não encontrado', 'COLABORADOR_NOT_FOUND');
  await garantirAtivo('setores', input.setorDestinoId, 'Setor de destino não encontrado', 'SETOR_NOT_FOUND');
  if (input.atividadeId !== undefined) {
    await garantirAtivo('atividades', input.atividadeId, 'Atividade não encontrada', 'ATIVIDADE_NOT_FOUND');
  }
  if (input.itemKitId !== undefined) {
    await validarItemKit(input.ferramentaId, input.itemKitId);
  }

  const id = await inserirComTrava(input, usuarioId);

  const result = await query<Emprestimo>('SELECT * FROM vw_emprestimos_detalhe WHERE id = $1', [id]);
  return result.rows[0];
}

async function inserirComTrava(input: CriarEmprestimoInput, usuarioId: number): Promise<number> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const ferramenta = await client.query<{ status: string }>(
      'SELECT status FROM ferramentas WHERE id = $1 AND ativo = true FOR UPDATE',
      [input.ferramentaId]
    );
    if (!ferramenta.rows[0]) {
      throw new NotFoundError('Ferramenta não encontrada', 'FERRAMENTA_NOT_FOUND');
    }

    // Regra 2: indisponível não sai. O trigger fn_valida_retirada só confere o
    // status de ferramenta simples (o kit é controlado peça a peça), então a
    // checagem vale para o kit e para a peça avulsa aqui. O status do kit só
    // é 'em_uso' quando o kit inteiro está emprestado; peça avulsa não o muda.
    if (ferramenta.rows[0].status !== 'disponivel') {
      throw new ConflictError(
        `Ferramenta ${input.ferramentaId} não está disponível para empréstimo (status atual: ${ferramenta.rows[0].status})`,
        'FERRAMENTA_INDISPONIVEL'
      );
    }

    const inserido = await client.query<{ id: number }>(
      `INSERT INTO emprestimos (
         ferramenta_id, item_kit_id, colaborador_id, setor_destino_id, atividade_id,
         atividade_observacao, ordem_servico, observacoes_retirada,
         previsao_devolucao, usuario_retirada_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        input.ferramentaId,
        input.itemKitId ?? null,
        input.colaboradorId,
        input.setorDestinoId,
        input.atividadeId ?? null,
        input.atividadeObservacao ?? null,
        input.ordemServico ?? null,
        input.observacoesRetirada ?? null,
        input.previsaoDevolucao,
        usuarioId,
      ]
    );

    await client.query('COMMIT');
    return inserido.rows[0].id;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    return traduzirErroDeRetirada(error);
  } finally {
    client.release();
  }
}

/**
 * GET /v1/emprestimos/previsao-sugerida — hoje + N dias úteis (pula fins de
 * semana e feriados via feriadoService), como valor inicial editável da
 * previsão de devolução no formulário de retirada.
 */
export async function sugerirPrevisao(dias: number): Promise<{ previsaoDevolucao: string; diasUteis: number }> {
  // "Hoje" é a data em Brasília: depois das 21h o UTC já virou o dia seguinte
  // e a sugestão sairia um dia adiantada. 'en-CA' formata como YYYY-MM-DD.
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const data = await adicionarDiasUteis(hoje, dias);
  return { previsaoDevolucao: data.toISOString().slice(0, 10), diasUteis: dias };
}
