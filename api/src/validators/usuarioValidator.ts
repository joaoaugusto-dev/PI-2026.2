import { z } from 'zod';

export const listarUsuariosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  ativo: z
    .preprocess((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    }, z.boolean().optional())
    .optional(),
});

export type ListarUsuariosQuery = z.infer<typeof listarUsuariosQuerySchema>;

export const usuarioIdParamSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'ID deve ser um número' })
    .int('ID deve ser um número inteiro')
    .positive('ID deve ser um número inteiro positivo'),
});
