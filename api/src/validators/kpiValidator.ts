import { z } from 'zod';

// Janela máxima de um KPI de período: um ano corrido (366 dias cobre o ano bissexto, inclusive as duas pontas).
export const JANELA_MAXIMA_DIAS = 366;
export const LIMITE_PADRAO = 10;
export const LIMITE_MAXIMO = 50;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** AAAA-MM-DD com data de calendário real (2026-02-30 e 2026-13-01 são rejeitadas, não corrigidas). */
const dataIso = z
  .string({ required_error: 'obrigatório (AAAA-MM-DD)' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'deve estar no formato AAAA-MM-DD')
  .refine((valor) => {
    const [ano, mes, dia] = valor.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
  }, 'não é uma data válida');

/** Dias de calendário entre duas datas AAAA-MM-DD, contando as duas pontas (de = ate vale 1). */
export function diasNoPeriodo(de: string, ate: string): number {
  return Math.round((Date.parse(ate) - Date.parse(de)) / MS_POR_DIA) + 1;
}

/** Soma `dias` (pode ser negativo) a uma data AAAA-MM-DD. */
export function somarDias(data: string, dias: number): string {
  return new Date(Date.parse(data) + dias * MS_POR_DIA).toISOString().slice(0, 10);
}

const periodoBase = z.object({ de: dataIso, ate: dataIso });

function validarPeriodo(valor: { de: string; ate: string }, ctx: z.RefinementCtx) {
  // se uma das datas já falhou no formato, o erro dela é o relevante: não há como comparar
  if (!dataIso.safeParse(valor.de).success || !dataIso.safeParse(valor.ate).success) return;
  if (valor.de > valor.ate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['de'], message: '"de" não pode ser depois de "ate"' });
  } else if (diasNoPeriodo(valor.de, valor.ate) > JANELA_MAXIMA_DIAS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ate'],
      message: `o período não pode passar de ${JANELA_MAXIMA_DIAS} dias`,
    });
  }
}

const limite = z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_PADRAO);
const agrupar = z.enum(['ferramenta', 'categoria'], {
  errorMap: () => ({ message: 'agrupar deve ser ferramenta ou categoria' }),
});

// GET /kpis/ferramentas-mais-retiradas e /kpis/categorias-mais-utilizadas
export const kpiRankingQuerySchema = periodoBase.extend({ limit: limite }).superRefine(validarPeriodo);

// GET /kpis/avarias-por-categoria e /kpis/extravios-por-categoria (agrupam todas as categorias, sem limit)
export const kpiPeriodoQuerySchema = periodoBase.superRefine(validarPeriodo);

// GET /kpis/tempo-medio-posse e /kpis/taxa-avaria. min_devolucoes evita que um grupo com 1 devolução apareça no topo:
// 1 devolução com 1 avaria (100%) passando na frente de 10 em 50 (20%), ou 1 devolução muito demorada liderando o tempo médio
export const kpiAgrupadoQuerySchema = periodoBase
  .extend({
    agrupar: agrupar.default('categoria'),
    limit: limite,
    min_devolucoes: z.coerce.number().int().min(1).max(100000).default(1),
  })
  .superRefine(validarPeriodo);

// GET /kpis/evolucao
export const kpiEvolucaoQuerySchema = periodoBase
  .extend({
    granularidade: z
      .enum(['dia', 'semana', 'mes'], { errorMap: () => ({ message: 'granularidade deve ser dia, semana ou mes' }) })
      .default('dia'),
  })
  .superRefine(validarPeriodo);

// GET /kpis/emprestimos-abertos: instantâneo, só quantas linhas dos mais antigos devolver
export const kpiAbertosQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(5),
});

export type KpiRankingQuery = z.infer<typeof kpiRankingQuerySchema>;
export type KpiPeriodoQuery = z.infer<typeof kpiPeriodoQuerySchema>;
export type KpiAgrupadoQuery = z.infer<typeof kpiAgrupadoQuerySchema>;
export type KpiEvolucaoQuery = z.infer<typeof kpiEvolucaoQuerySchema>;
