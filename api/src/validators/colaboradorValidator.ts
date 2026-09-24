import { z } from 'zod';

export const listarColaboradoresQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().trim().min(1).max(150).optional(),
  setorId: z.coerce.number().int().positive().optional(),
  sort: z.enum(['nome', 'matricula']).optional(),
});

export type ListarColaboradoresQuery = z.infer<typeof listarColaboradoresQuerySchema>;

// GET /v1/colaboradores/identificar?termo= — Regra 5: aceita matrícula ou
// nome (sem codigo_cracha, ver nota de escopo da issue #45). O termo é
// testado primeiro como matrícula exata e, se não achar, por nome com
// unaccent/pg_trgm (ColaboradorService decide a estratégia).
export const identificarColaboradorQuerySchema = z.object({
  termo: z
    .string({ required_error: 'Termo é obrigatório', invalid_type_error: 'Termo deve ser um texto' })
    .trim()
    .min(1, 'Termo não pode ser vazio')
    .max(150, 'Termo deve ter no máximo 150 caracteres'),
});

export type IdentificarColaboradorQuery = z.infer<typeof identificarColaboradorQuerySchema>;

export const colaboradorIdParamSchema = z.object({
  id: z.coerce.number({ invalid_type_error: 'ID deve ser um número' }).int('ID deve ser um número inteiro').positive('ID deve ser um número inteiro positivo'),
});

// Escopo final da API-09 (issue #45): matrícula, nome e setor. Sem
// codigo_cracha (o crachá é a própria matrícula, Regra 5) e sem cargo —
// nenhum dos dois existe em colaboradores (ver 0001_init.sql). criado_por
// não entra aqui: vem sempre do JWT (Regra 6), nunca do corpo.
export const criarColaboradorSchema = z.object({
  nome: z
    .string({ required_error: 'Nome é obrigatório', invalid_type_error: 'Nome deve ser um texto' })
    .trim()
    .min(1, 'Nome não pode ser vazio')
    .max(150, 'Nome deve ter no máximo 150 caracteres'),
  matricula: z
    .string({ required_error: 'Matrícula é obrigatória', invalid_type_error: 'Matrícula deve ser um texto' })
    .trim()
    .min(1, 'Matrícula não pode ser vazia')
    .max(50, 'Matrícula deve ter no máximo 50 caracteres'),
  setorId: z.coerce
    .number({ required_error: 'setorId é obrigatório', invalid_type_error: 'setorId deve ser um número' })
    .int('setorId deve ser um número inteiro')
    .positive('setorId deve ser um número positivo'),
});

export type CriarColaboradorInput = z.infer<typeof criarColaboradorSchema>;

export const editarColaboradorSchema = criarColaboradorSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser fornecido para edição',
  });

export type EditarColaboradorInput = z.infer<typeof editarColaboradorSchema>;
