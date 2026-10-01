import { z } from 'zod';

// GET /v1/notificacoes?lida=false&page=&limit=
export const listarNotificacoesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  lida: z
    .enum(['true', 'false'], { errorMap: () => ({ message: 'lida deve ser true ou false' }) })
    .transform((v) => v === 'true')
    .optional(),
});

export type ListarNotificacoesQuery = z.infer<typeof listarNotificacoesQuerySchema>;

export const notificacaoIdParamSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'id deve ser um número' })
    .int('id deve ser um número inteiro')
    .positive('id deve ser um número positivo'),
});
