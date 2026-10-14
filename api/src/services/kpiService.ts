import type { PoolClient } from 'pg';
import { query } from '../config/database.js';
import { emSnapshot } from './dashboardService.js';
import { diasNoPeriodo, somarDias } from '../validators/kpiValidator.js';

// KPIs de gestão (issue #208). Tudo é agregado no SQL; o dia vale pelo calendário de Brasília (o servidor na
// AWS roda em UTC), com `de` e `ate` inclusivos: [de 00:00, ate+1 00:00) em Brasília. Escrito como
// "coluna >= constante" para o Postgres poder usar os índices de data. Só os de colaborador são pessoais (admin); nenhum devolve valores.
const FUSO = 'America/Sao_Paulo';
const INICIO = (n: number) => `($${n}::date)::timestamp AT TIME ZONE '${FUSO}'`;
const FIM = (n: number) => `(($${n}::date + 1))::timestamp AT TIME ZONE '${FUSO}'`;
const NOS_DIAS = (coluna: string, de: number, ate: number) => `${coluna} >= ${INICIO(de)} AND ${coluna} < ${FIM(ate)}`;

export interface Periodo {
  de: string;
  ate: string;
}

export type Agrupamento = 'ferramenta' | 'categoria';
export type Granularidade = 'dia' | 'semana' | 'mes';

const arredondar = (valor: number, casas: number) => Number(valor.toFixed(casas));

const num = (valor: unknown) => Number(valor);

// ---------------------------------------------------------------------------------------------------------
// Uso
// ---------------------------------------------------------------------------------------------------------

export async function ferramentasMaisRetiradas(p: Periodo, limit: number) {
  const { rows } = await query(
    `SELECT f.id AS ferramenta_id, f.nome AS ferramenta_nome, f.codigo_identificacao,
            g.nome AS categoria_nome, COUNT(*) AS total_retiradas
       FROM emprestimos e
       JOIN ferramentas f ON f.id = e.ferramenta_id
       JOIN grupos_ferramentas g ON g.id = f.grupo_id
      WHERE ${NOS_DIAS('e.data_retirada', 1, 2)}
      GROUP BY f.id, f.nome, f.codigo_identificacao, g.nome
      ORDER BY total_retiradas DESC, f.nome, f.id
      LIMIT $3`,
    [p.de, p.ate, limit]
  );
  return { periodo: p, itens: rows.map((r) => ({ ...r, total_retiradas: num(r.total_retiradas) })) };
}

export async function categoriasMaisUtilizadas(p: Periodo, limit: number) {
  const { rows } = await query(
    `SELECT g.id AS categoria_id, g.nome AS categoria_nome, COUNT(*) AS total_retiradas
       FROM emprestimos e
       JOIN ferramentas f ON f.id = e.ferramenta_id
       JOIN grupos_ferramentas g ON g.id = f.grupo_id
      WHERE ${NOS_DIAS('e.data_retirada', 1, 2)}
      GROUP BY g.id, g.nome
      ORDER BY total_retiradas DESC, g.nome, g.id
      LIMIT $3`,
    [p.de, p.ate, limit]
  );
  return { periodo: p, itens: rows.map((r) => ({ ...r, total_retiradas: num(r.total_retiradas) })) };
}

export async function colaboradoresQueMaisRetiram(p: Periodo, limit: number) {
  const { rows } = await query(
    `SELECT c.id AS colaborador_id, c.nome AS colaborador_nome, c.matricula, s.nome AS setor_nome, COUNT(*) AS total_retiradas
       FROM emprestimos e
       JOIN colaboradores c ON c.id = e.colaborador_id
       JOIN setores s ON s.id = c.setor_id
      WHERE ${NOS_DIAS('e.data_retirada', 1, 2)}
      GROUP BY c.id, c.nome, c.matricula, s.nome
      ORDER BY total_retiradas DESC, c.nome, c.id
      LIMIT $3`,
    [p.de, p.ate, limit]
  );
  return { periodo: p, itens: rows.map((r) => ({ ...r, total_retiradas: num(r.total_retiradas) })) };
}

// Setor do empréstimo = setor de destino informado na retirada (emprestimos.setor_destino_id), que é para onde a
// ferramenta foi, e não necessariamente o setor de cadastro de quem retirou.
export async function setoresQueMaisRetiram(p: Periodo, limit: number) {
  const { rows } = await query(
    `SELECT s.id AS setor_id, s.nome AS setor_nome, COUNT(*) AS total_retiradas
       FROM emprestimos e
       JOIN setores s ON s.id = e.setor_destino_id
      WHERE ${NOS_DIAS('e.data_retirada', 1, 2)}
      GROUP BY s.id, s.nome
      ORDER BY total_retiradas DESC, s.nome, s.id
      LIMIT $3`,
    [p.de, p.ate, limit]
  );
  return { periodo: p, itens: rows.map((r) => ({ ...r, total_retiradas: num(r.total_retiradas) })) };
}

// Colunas de identificação e GROUP BY de cada agrupamento (ferramenta ou categoria), usados nos KPIs
// "agrupar=ferramenta|categoria". Valores fixos no código, nunca vindos da requisição.
const AGRUPAMENTO = {
  ferramenta: {
    colunas: 'f.id AS ferramenta_id, f.nome AS ferramenta_nome, f.codigo_identificacao, g.nome AS categoria_nome',
    grupo: 'f.id, f.nome, f.codigo_identificacao, g.nome',
    ordem: 'f.nome, f.id',
  },
  categoria: {
    colunas: 'g.id AS categoria_id, g.nome AS categoria_nome',
    grupo: 'g.id, g.nome',
    ordem: 'g.nome, g.id',
  },
} as const;

export async function tempoMedioPosse(p: Periodo, agrupar: Agrupamento, limit: number) {
  const a = AGRUPAMENTO[agrupar];
  // só empréstimos devolvidos dentro do período: o tempo de posse só existe depois da devolução
  const { rows } = await query(
    `SELECT ${a.colunas},
            COUNT(*) AS total_devolucoes,
            AVG(EXTRACT(EPOCH FROM (e.data_devolucao - e.data_retirada))) / 3600 AS horas_medias
       FROM emprestimos e
       JOIN ferramentas f ON f.id = e.ferramenta_id
       JOIN grupos_ferramentas g ON g.id = f.grupo_id
      WHERE ${NOS_DIAS('e.data_devolucao', 1, 2)}
      GROUP BY ${a.grupo}
      ORDER BY horas_medias DESC, ${a.ordem}
      LIMIT $3`,
    [p.de, p.ate, limit]
  );
  return {
    periodo: p,
    agrupar,
    itens: rows.map((r) => ({
      ...r,
      total_devolucoes: num(r.total_devolucoes),
      horas_medias: arredondar(num(r.horas_medias), 2),
      dias_medios: arredondar(num(r.horas_medias) / 24, 2),
    })),
  };
}

// ---------------------------------------------------------------------------------------------------------
// Avarias e perdas
// ---------------------------------------------------------------------------------------------------------

// O trigger fn_abre_ocorrencia grava o tipo em maiúsculas (AVARIA, PERDA); UPPER protege de linha antiga.
async function ocorrenciasPorCategoria(p: Periodo, tipo: 'AVARIA' | 'PERDA') {
  const { rows } = await query(
    `SELECT g.id AS categoria_id, g.nome AS categoria_nome, COUNT(*) AS total
       FROM ocorrencias o
       JOIN ferramentas f ON f.id = o.ferramenta_id
       JOIN grupos_ferramentas g ON g.id = f.grupo_id
      WHERE UPPER(o.tipo) = $3 AND ${NOS_DIAS('o.created_at', 1, 2)}
      GROUP BY g.id, g.nome
      ORDER BY total DESC, g.nome, g.id`,
    [p.de, p.ate, tipo]
  );
  const itens = rows.map((r) => ({ ...r, total: num(r.total) }));
  return { periodo: p, total: itens.reduce((soma, i) => soma + i.total, 0), itens };
}

export const avariasPorCategoria = (p: Periodo) => ocorrenciasPorCategoria(p, 'AVARIA');
export const perdasPorCategoria = (p: Periodo) => ocorrenciasPorCategoria(p, 'PERDA');

export async function taxaAvaria(p: Periodo, agrupar: Agrupamento, limit: number, minDevolucoes = 1) {
  const a = AGRUPAMENTO[agrupar];
  // denominador: devoluções feitas dentro do período; numerador: as que voltaram com avaria (perda não entra,
  // tem KPI próprio). Só entram grupos com pelo menos minDevolucoes devoluções (mínimo 1, então a divisão nunca
  // é por zero); o HAVING vale antes do LIMIT, para o ranking não ser ocupado por amostras de 1 devolução.
  const { rows } = await query(
    `SELECT ${a.colunas},
            COUNT(*) AS total_devolucoes,
            COUNT(*) FILTER (WHERE e.condicao_devolucao = 'avaria') AS total_avarias
       FROM emprestimos e
       JOIN ferramentas f ON f.id = e.ferramenta_id
       JOIN grupos_ferramentas g ON g.id = f.grupo_id
      WHERE ${NOS_DIAS('e.data_devolucao', 1, 2)}
      GROUP BY ${a.grupo}
      HAVING COUNT(*) >= $4
      ORDER BY (COUNT(*) FILTER (WHERE e.condicao_devolucao = 'avaria'))::numeric / COUNT(*) DESC,
               COUNT(*) DESC, ${a.ordem}
      LIMIT $3`,
    [p.de, p.ate, limit, minDevolucoes]
  );
  return {
    periodo: p,
    agrupar,
    itens: rows.map((r) => {
      const devolucoes = num(r.total_devolucoes);
      const avarias = num(r.total_avarias);
      const taxa = devolucoes === 0 ? 0 : avarias / devolucoes;
      return {
        ...r,
        total_devolucoes: devolucoes,
        total_avarias: avarias,
        taxa_avaria: arredondar(taxa, 4),
        percentual: arredondar(taxa * 100, 2),
      };
    }),
  };
}

// ---------------------------------------------------------------------------------------------------------
// Instantâneos (sem período)
// ---------------------------------------------------------------------------------------------------------

export async function indisponiveisAgora() {
  return emSnapshot(async (client: PoolClient) => {
    const { rows: resumo } = await client.query(
      `SELECT COUNT(*) AS cadastradas, COUNT(*) FILTER (WHERE status = 'indisponivel') AS indisponiveis
         FROM ferramentas WHERE ativo = TRUE`
    );
    const { rows: porMotivo } = await client.query(
      `SELECT COALESCE(motivo_indisponivel::text, 'sem_motivo') AS motivo, COUNT(*) AS total
         FROM ferramentas
        WHERE ativo = TRUE AND status = 'indisponivel'
        GROUP BY 1
        ORDER BY total DESC, motivo`
    );
    const cadastradas = num(resumo[0].cadastradas);
    const indisponiveis = num(resumo[0].indisponiveis);
    return {
      total_cadastradas: cadastradas,
      total_indisponiveis: indisponiveis,
      percentual_do_parque: cadastradas === 0 ? 0 : arredondar((indisponiveis / cadastradas) * 100, 2),
      por_motivo: porMotivo.map((r) => ({ motivo: r.motivo as string, total: num(r.total) })),
    };
  });
}

export async function emprestimosAbertosAgora(limit: number) {
  return emSnapshot(async (client: PoolClient) => {
    const { rows: resumo } = await client.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE (previsao_devolucao AT TIME ZONE '${FUSO}')::date < (NOW() AT TIME ZONE '${FUSO}')::date) AS atrasados
         FROM emprestimos WHERE data_devolucao IS NULL`
    );
    // sem colaborador de propósito: o KPI mostra o que está fora, não quem está com a ferramenta
    const { rows: antigos } = await client.query(
      `SELECT e.id AS emprestimo_id, f.id AS ferramenta_id, f.nome AS ferramenta_nome, f.codigo_identificacao,
              g.nome AS categoria_nome, e.data_retirada, e.previsao_devolucao,
              ((NOW() AT TIME ZONE '${FUSO}')::date - (e.data_retirada AT TIME ZONE '${FUSO}')::date) AS dias_aberto
         FROM emprestimos e
         JOIN ferramentas f ON f.id = e.ferramenta_id
         JOIN grupos_ferramentas g ON g.id = f.grupo_id
        WHERE e.data_devolucao IS NULL
        ORDER BY e.data_retirada, e.id
        LIMIT $1`,
      [limit]
    );
    return {
      total: num(resumo[0].total),
      atrasados: num(resumo[0].atrasados),
      mais_antigos: antigos.map((r) => ({ ...r, dias_aberto: num(r.dias_aberto) })),
    };
  });
}

// ---------------------------------------------------------------------------------------------------------
// Evolução no tempo
// ---------------------------------------------------------------------------------------------------------

interface Totais {
  retiradas: number;
  devolucoes: number;
  ocorrencias: number;
}

const TRUNC: Record<Granularidade, string> = { dia: 'day', semana: 'week', mes: 'month' };

async function totaisDoPeriodo(client: PoolClient, de: string, ate: string): Promise<Totais> {
  const { rows } = await client.query(
    `SELECT
       (SELECT COUNT(*) FROM emprestimos WHERE ${NOS_DIAS('data_retirada', 1, 2)}) AS retiradas,
       (SELECT COUNT(*) FROM emprestimos WHERE ${NOS_DIAS('data_devolucao', 1, 2)}) AS devolucoes,
       (SELECT COUNT(*) FROM ocorrencias WHERE ${NOS_DIAS('created_at', 1, 2)}) AS ocorrencias`,
    [de, ate]
  );
  return { retiradas: num(rows[0].retiradas), devolucoes: num(rows[0].devolucoes), ocorrencias: num(rows[0].ocorrencias) };
}

/** Variação % sobre o período anterior; sem base de comparação (anterior = 0) não existe percentual: null. */
function variacao(atual: number, anterior: number): number | null {
  return anterior === 0 ? null : arredondar(((atual - anterior) / anterior) * 100, 2);
}

export async function evolucao(p: Periodo, granularidade: Granularidade) {
  // período anterior: a janela imediatamente antes, com o mesmo número de dias
  const dias = diasNoPeriodo(p.de, p.ate);
  const anterior: Periodo = { de: somarDias(p.de, -dias), ate: somarDias(p.de, -1) };
  const trunc = TRUNC[granularidade];

  return emSnapshot(async (client) => {
    // generate_series cria todos os baldes do período (inclusive os vazios, com zero), para o gráfico não
    // ter buracos. Semana começa na segunda e mês no dia 1; o primeiro e o último balde podem ser parciais,
    // e só contam o que cai dentro de [de, ate].
    const { rows } = await client.query(
      `WITH baldes AS (
         SELECT generate_series(date_trunc('${trunc}', $1::date::timestamp), date_trunc('${trunc}', $2::date::timestamp), '1 ${trunc}'::interval)::date AS inicio
       ),
       c_retiradas AS (
         SELECT date_trunc('${trunc}', data_retirada AT TIME ZONE '${FUSO}')::date AS inicio, COUNT(*) AS total
           FROM emprestimos WHERE ${NOS_DIAS('data_retirada', 1, 2)} GROUP BY 1
       ),
       c_devolucoes AS (
         SELECT date_trunc('${trunc}', data_devolucao AT TIME ZONE '${FUSO}')::date AS inicio, COUNT(*) AS total
           FROM emprestimos WHERE ${NOS_DIAS('data_devolucao', 1, 2)} GROUP BY 1
       ),
       c_ocorrencias AS (
         SELECT date_trunc('${trunc}', created_at AT TIME ZONE '${FUSO}')::date AS inicio, COUNT(*) AS total
           FROM ocorrencias WHERE ${NOS_DIAS('created_at', 1, 2)} GROUP BY 1
       )
       SELECT to_char(b.inicio, 'YYYY-MM-DD') AS inicio,
              COALESCE(r.total, 0) AS retiradas, COALESCE(d.total, 0) AS devolucoes, COALESCE(o.total, 0) AS ocorrencias
         FROM baldes b
         LEFT JOIN c_retiradas r USING (inicio)
         LEFT JOIN c_devolucoes d USING (inicio)
         LEFT JOIN c_ocorrencias o USING (inicio)
        ORDER BY b.inicio`,
      [p.de, p.ate]
    );
    const serie = rows.map((r) => ({
      inicio: r.inicio as string,
      retiradas: num(r.retiradas),
      devolucoes: num(r.devolucoes),
      ocorrencias: num(r.ocorrencias),
    }));
    const totalAtual = await totaisDoPeriodo(client, p.de, p.ate);
    const totalAnterior = await totaisDoPeriodo(client, anterior.de, anterior.ate);
    return {
      periodo: p,
      periodo_anterior: anterior,
      granularidade,
      serie,
      totais: { atual: totalAtual, anterior: totalAnterior },
      variacao_percentual: {
        retiradas: variacao(totalAtual.retiradas, totalAnterior.retiradas),
        devolucoes: variacao(totalAtual.devolucoes, totalAnterior.devolucoes),
        ocorrencias: variacao(totalAtual.ocorrencias, totalAnterior.ocorrencias),
      },
    };
  });
}
