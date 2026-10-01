import type { PoolClient } from 'pg';
import { getClient } from '../config/database.js';

export interface EmprestimoPendente {
  id: number;
  colaborador_nome: string;
  colaborador_matricula: string;
  setor_nome: string;
  ferramenta_nome: string;
  codigo_identificacao: number | null;
  previsao_devolucao: string;
  /** Atrasados: dias de atraso. Próximos do prazo: dias que faltam. Cobrar hoje: 0. */
  dias: number;
}

export interface FerramentaAguardando {
  ferramenta_id: number;
  ferramenta_nome: string;
  codigo_identificacao: number | null;
  ocorrencia_id: number | null;
  tipo: string | null;
  etapa: 'aberta' | 'em_reparo' | 'cobrada' | 'resolvida' | 'baixada' | null;
  dias_parada: number;
}

export interface Lista<T> {
  total: number;
  itens: T[];
}

export interface Kpis {
  cadastradas: number;
  disponiveis: number;
  em_uso: number;
  indisponiveis: number;
  atrasadas: number;
  ocorrencias: number;
}

export interface Dashboard {
  kpis: Kpis;
  cobrar_hoje: Lista<EmprestimoPendente>;
  atrasados: Lista<EmprestimoPendente>;
  proximos_do_prazo: Lista<EmprestimoPendente>;
  indisponiveis: Lista<FerramentaAguardando>;
}

const DIAS_PROXIMOS = 3;
// o prazo vale pelo dia em Brasília: "hoje" é a data de lá, não a do servidor
const HOJE = "(NOW() AT TIME ZONE 'America/Sao_Paulo')::date";
const DIA_PREVISTO = "(previsao_devolucao AT TIME ZONE 'America/Sao_Paulo')::date";

const LIMITE_CARTAO = 4; // linhas que cada cartão mostra; o resto vem paginado por lista()

export const LISTAS_DASHBOARD = ['cobrar_hoje', 'atrasados', 'proximos_do_prazo', 'indisponiveis'] as const;
export type NomeLista = (typeof LISTAS_DASHBOARD)[number];

/**
 * Roda `fn` numa única conexão e numa única "fotografia" do banco (transação REPEATABLE READ somente
 * leitura): tudo que `fn` consulta é coerente entre si, mesmo com devoluções acontecendo ao lado. A
 * conexão volta ao pool no fim, com sucesso ou erro. Exportado para o teste do caminho de erro.
 */
export async function emSnapshot<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function emprestimos(
  client: PoolClient,
  condicaoDia: string,
  params: unknown[],
  limit: number,
  offset: number
): Promise<Lista<EmprestimoPendente>> {
  const where = `data_devolucao IS NULL AND ${condicaoDia}`;
  const n = params.length;
  const total = await client.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM vw_emprestimos_detalhe WHERE ${where}`,
    params
  );
  const itens = await client.query<EmprestimoPendente>(
    `SELECT id, colaborador_nome, colaborador_matricula, setor_nome, ferramenta_nome, codigo_identificacao,
            previsao_devolucao, ABS(${DIA_PREVISTO} - ${HOJE})::int AS dias
     FROM vw_emprestimos_detalhe
     WHERE ${where}
     ORDER BY previsao_devolucao, id
     LIMIT $${n + 1} OFFSET $${n + 2}`,
    [...params, limit, offset]
  );
  return { total: Number(total.rows[0].total), itens: itens.rows };
}

async function ferramentasAguardando(client: PoolClient, limit: number, offset: number): Promise<Lista<FerramentaAguardando>> {
  // a ocorrência em andamento mais recente de cada ferramenta indisponível (pode não haver, se foi marcada à mão)
  const base = `
    FROM ferramentas f
    LEFT JOIN LATERAL (
      SELECT id, tipo, status, created_at FROM ocorrencias o
      WHERE o.ferramenta_id = f.id AND o.status IN ('aberta', 'em_reparo', 'cobrada')
      ORDER BY o.created_at DESC, o.id DESC LIMIT 1
    ) oc ON TRUE
    WHERE f.ativo = TRUE AND f.status = 'indisponivel'`;
  const total = await client.query<{ total: string }>(`SELECT COUNT(*)::text AS total ${base}`);
  const itens = await client.query<FerramentaAguardando>(
    `SELECT f.id AS ferramenta_id, f.nome AS ferramenta_nome, f.codigo_identificacao,
            oc.id AS ocorrencia_id, oc.tipo, oc.status AS etapa,
            GREATEST(0, (${HOJE} - (COALESCE(oc.created_at, f.updated_at) AT TIME ZONE 'America/Sao_Paulo')::date))::int AS dias_parada
     ${base}
     ORDER BY COALESCE(oc.created_at, f.updated_at), f.id
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return { total: Number(total.rows[0].total), itens: itens.rows };
}

async function contadores(client: PoolClient): Promise<Kpis> {
  const { rows } = await client.query<Record<string, string>>('SELECT * FROM vw_dashboard_kpis');
  const k = rows[0];
  return {
    cadastradas: Number(k.total_cadastradas),
    disponiveis: Number(k.total_disponiveis),
    em_uso: Number(k.total_em_uso),
    indisponiveis: Number(k.total_indisponiveis),
    atrasadas: Number(k.total_atrasadas),
    ocorrencias: Number(k.ocorrencias_abertas),
  };
}

function listaNoSnapshot(client: PoolClient, nome: 'indisponiveis', limit: number, offset: number): Promise<Lista<FerramentaAguardando>>;
function listaNoSnapshot(client: PoolClient, nome: Exclude<NomeLista, 'indisponiveis'>, limit: number, offset: number): Promise<Lista<EmprestimoPendente>>;
function listaNoSnapshot(client: PoolClient, nome: NomeLista, limit: number, offset: number): Promise<Lista<EmprestimoPendente | FerramentaAguardando>>;
function listaNoSnapshot(client: PoolClient, nome: NomeLista, limit: number, offset: number): Promise<Lista<EmprestimoPendente | FerramentaAguardando>> {
  switch (nome) {
    case 'cobrar_hoje':
      return emprestimos(client, `${DIA_PREVISTO} = ${HOJE}`, [], limit, offset);
    case 'atrasados':
      return emprestimos(client, `${DIA_PREVISTO} < ${HOJE}`, [], limit, offset);
    case 'proximos_do_prazo':
      return emprestimos(client, `${DIA_PREVISTO} > ${HOJE} AND ${DIA_PREVISTO} <= ${HOJE} + $1::int`, [DIAS_PROXIMOS], limit, offset);
    case 'indisponiveis':
      return ferramentasAguardando(client, limit, offset);
  }
}

/**
 * GET /v1/dashboard — a barra de contadores (vw_dashboard_kpis) e só o que pede uma ação do balcão:
 * devoluções para cobrar hoje, atrasadas (previsão em dia anterior), próximas do prazo e ferramentas
 * indisponíveis esperando tratativa.
 *
 * Contadores e as quatro listas saem de uma conexão só e do mesmo snapshot (as consultas rodam em
 * sequência): o painel é coerente entre si e a requisição ocupa 1 conexão do pool, não 5. Cada lista
 * vem com o total e só as primeiras linhas (as que o cartão mostra); o "Mostrar tudo" pagina por
 * GET /v1/dashboard/:lista.
 */
export function obter(): Promise<Dashboard> {
  return emSnapshot(async (client) => {
    const kpis = await contadores(client);
    const cobrarHoje = await listaNoSnapshot(client, 'cobrar_hoje', LIMITE_CARTAO, 0);
    const atrasados = await listaNoSnapshot(client, 'atrasados', LIMITE_CARTAO, 0);
    const proximos = await listaNoSnapshot(client, 'proximos_do_prazo', LIMITE_CARTAO, 0);
    const indisponiveis = await listaNoSnapshot(client, 'indisponiveis', LIMITE_CARTAO, 0);
    // o contador usa a mesma definição da lista (previsão em dia anterior), e não a da view (já passou do
    // horário), para a barra e o cartão de atrasados mostrarem o mesmo número
    kpis.atrasadas = atrasados.total;
    return { kpis, cobrar_hoje: cobrarHoje, atrasados, proximos_do_prazo: proximos, indisponiveis };
  });
}

/** Uma lista do dashboard, paginada: o "Mostrar tudo" de cada cartão. */
export function lista(nome: 'indisponiveis', limit: number, offset?: number): Promise<Lista<FerramentaAguardando>>;
export function lista(nome: Exclude<NomeLista, 'indisponiveis'>, limit: number, offset?: number): Promise<Lista<EmprestimoPendente>>;
export function lista(nome: NomeLista, limit: number, offset?: number): Promise<Lista<EmprestimoPendente | FerramentaAguardando>>;
export function lista(nome: NomeLista, limit: number, offset = 0): Promise<Lista<EmprestimoPendente | FerramentaAguardando>> {
  return emSnapshot((client) => listaNoSnapshot(client, nome, limit, offset));
}
