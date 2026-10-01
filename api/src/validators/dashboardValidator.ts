import { z } from 'zod';
import { LISTAS_DASHBOARD } from '../services/dashboardService.js';

export const dashboardListaParamSchema = z.object({
  lista: z.enum(LISTAS_DASHBOARD, {
    errorMap: () => ({ message: `lista deve ser uma de: ${LISTAS_DASHBOARD.join(', ')}` }),
  }),
});
