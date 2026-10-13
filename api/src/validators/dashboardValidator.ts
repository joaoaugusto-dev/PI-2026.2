import { z } from 'zod';
import { LISTAS_DASHBOARD } from '../services/dashboardService.js';

export const dashboardListaParamSchema = z.object({
  lista: z.enum(LISTAS_DASHBOARD, {
    errorMap: () => ({ message: `lista deve ser uma de: ${LISTAS_DASHBOARD.join(', ')}` }),
  }),
});

// Paginação do "Mostrar tudo": o front pede 15 por página. Com o teto de 50 por página e 100000 páginas, o
// OFFSET máximo é 5 milhões (muito além de qualquer fila do balcão, e longe do estouro do bigint).
export const POR_PAGINA_PADRAO = 15;
export const POR_PAGINA_MAXIMO = 50;
const PAGINA_MAXIMA = 100000;

// page e limit malformados (abc, 0, 1e20) viram 400 em vez de chegar ao OFFSET da consulta e dar 500
export const dashboardListaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(PAGINA_MAXIMA).optional(),
  limit: z.coerce.number().int().min(1).max(POR_PAGINA_MAXIMO).optional(),
});
