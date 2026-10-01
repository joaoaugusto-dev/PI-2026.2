import { query } from '../config/database.js';

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

async function emprestimos(condicaoDia: string, params: unknown[], ordem: 'ASC' | 'DESC'): Promise<Lista<EmprestimoPendente>> {
  const where = `data_devolucao IS NULL AND ${condicaoDia}`;
  const [total, itens] = await Promise.all([
    query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM vw_emprestimos_detalhe WHERE ${where}`, params),
    query<EmprestimoPendente>(
      `SELECT id, colaborador_nome, colaborador_matricula, setor_nome, ferramenta_nome, codigo_identificacao,
              previsao_devolucao, ABS(${DIA_PREVISTO} - ${HOJE})::int AS dias
       FROM vw_emprestimos_detalhe
       WHERE ${where}
       ORDER BY previsao_devolucao ${ordem}, id`,
      params
    ),
  ]);
  return { total: Number(total.rows[0].total), itens: itens.rows };
}

/**
 * Devolve todos os itens de cada lista (o front mostra os primeiros e expande com "Mostrar tudo"):
 * a fila do balcão é de dezenas, não de milhares. Se crescer, paginar por lista.
 *
 * GET /v1/dashboard — a barra de contadores (vw_dashboard_kpis) e só o que pede uma ação do balcão: devoluções para cobrar hoje, atrasadas
 * (previsão em dia anterior), próximas do prazo e ferramentas indisponíveis esperando tratativa.
 */
export async function obter(): Promise<Dashboard> {
  const [kpis, cobrarHoje, atrasados, proximos, indisponiveis] = await Promise.all([
    contadores(),
    emprestimos(`${DIA_PREVISTO} = ${HOJE}`, [], 'ASC'),
    emprestimos(`${DIA_PREVISTO} < ${HOJE}`, [], 'ASC'),
    emprestimos(`${DIA_PREVISTO} > ${HOJE} AND ${DIA_PREVISTO} <= ${HOJE} + $1::int`, [DIAS_PROXIMOS], 'ASC'),
    ferramentasAguardando(),
  ]);
  return { kpis, cobrar_hoje: cobrarHoje, atrasados, proximos_do_prazo: proximos, indisponiveis };
}

async function contadores(): Promise<Kpis> {
  const { rows } = await query<Record<string, string>>('SELECT * FROM vw_dashboard_kpis');
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

async function ferramentasAguardando(): Promise<Lista<FerramentaAguardando>> {
  // a ocorrência em andamento mais recente de cada ferramenta indisponível (pode não haver, se foi marcada à mão)
  const base = `
    FROM ferramentas f
    LEFT JOIN LATERAL (
      SELECT id, tipo, status FROM ocorrencias o
      WHERE o.ferramenta_id = f.id AND o.status IN ('aberta', 'em_reparo', 'cobrada')
      ORDER BY o.created_at DESC, o.id DESC LIMIT 1
    ) oc ON TRUE
    WHERE f.ativo = TRUE AND f.status = 'indisponivel'`;
  const [total, itens] = await Promise.all([
    query<{ total: string }>(`SELECT COUNT(*)::text AS total ${base}`),
    query<FerramentaAguardando>(
      `SELECT f.id AS ferramenta_id, f.nome AS ferramenta_nome, f.codigo_identificacao,
              oc.id AS ocorrencia_id, oc.tipo, oc.status AS etapa,
              GREATEST(0, (${HOJE} - (f.updated_at AT TIME ZONE 'America/Sao_Paulo')::date))::int AS dias_parada
       ${base}
       ORDER BY f.updated_at, f.id`
    ),
  ]);
  return { total: Number(total.rows[0].total), itens: itens.rows };
}
