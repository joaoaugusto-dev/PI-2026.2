import { z } from 'zod';
import { LISTAS_DASHBOARD } from '../services/dashboardService.js';

export const dashboardListaParamSchema = z.object({
  lista: z.enum(LISTAS_DASHBOARD, {
    errorMap: () => ({ message: `lista deve ser uma de: ${LISTAS_DASHBOARD.join(', ')}` }),
  }),
});

// page e limit malformados (abc, 0, 1e20) viram 400 em vez de chegar ao OFFSET da consulta e dar 500
export const dashboardListaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
