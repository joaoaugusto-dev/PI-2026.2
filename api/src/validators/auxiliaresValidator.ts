import { z } from 'zod';

export const listarAuxiliaresQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().trim().min(1).max(150).optional(),
  incluirInativos: z
    .preprocess((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    }, z.boolean().optional())
    .optional(),
  sort: z.enum(['nome', 'id', 'created_at']).optional(),
  order: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional(),
});

export type ListarAuxiliaresQuery = z.infer<typeof listarAuxiliaresQuerySchema>;

export const auxiliarIdParamSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'ID deve ser um número' })
    .int('ID deve ser um número inteiro')
    .positive('ID deve ser um número inteiro positivo'),
});

// -------------------------------------------------------------
// Setores
// -------------------------------------------------------------
export const criarSetorSchema = z.object({
  nome: z
    .string({ required_error: 'Nome é obrigatório', invalid_type_error: 'Nome deve ser um texto' })
    .trim()
    .min(1, 'Nome não pode ser vazio')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
});

export type CriarSetorInput = z.infer<typeof criarSetorSchema>;

export const atualizarSetorSchema = z
  .object({
    nome: z
      .string({ invalid_type_error: 'Nome deve ser um texto' })
      .trim()
      .min(1, 'Nome não pode ser vazio')
      .max(100, 'Nome deve ter no máximo 100 caracteres')
      .optional(),
    ativo: z.boolean({ invalid_type_error: 'Ativo deve ser um booleano' }).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

export type AtualizarSetorInput = z.infer<typeof atualizarSetorSchema>;

// -------------------------------------------------------------
// Categorias (Grupos de Ferramentas)
// -------------------------------------------------------------
export const criarCategoriaSchema = z.object({
  nome: z
    .string({ required_error: 'Nome é obrigatório', invalid_type_error: 'Nome deve ser um texto' })
    .trim()
    .min(1, 'Nome não pode ser vazio')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
});

export type CriarCategoriaInput = z.infer<typeof criarCategoriaSchema>;

export const atualizarCategoriaSchema = z
  .object({
    nome: z
      .string({ invalid_type_error: 'Nome deve ser um texto' })
      .trim()
      .min(1, 'Nome não pode ser vazio')
      .max(100, 'Nome deve ter no máximo 100 caracteres')
      .optional(),
    ativo: z.boolean({ invalid_type_error: 'Ativo deve ser um booleano' }).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

export type AtualizarCategoriaInput = z.infer<typeof atualizarCategoriaSchema>;

// -------------------------------------------------------------
// Atividades
// -------------------------------------------------------------
export const criarAtividadeSchema = z.object({
  nome: z
    .string({ required_error: 'Nome é obrigatório', invalid_type_error: 'Nome deve ser um texto' })
    .trim()
    .min(1, 'Nome não pode ser vazio')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  descricao: z
    .string({ invalid_type_error: 'Descrição deve ser um texto' })
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .optional()
    .nullable(),
});

export type CriarAtividadeInput = z.infer<typeof criarAtividadeSchema>;

export const atualizarAtividadeSchema = z
  .object({
    nome: z
      .string({ invalid_type_error: 'Nome deve ser um texto' })
      .trim()
      .min(1, 'Nome não pode ser vazio')
      .max(100, 'Nome deve ter no máximo 100 caracteres')
      .optional(),
    descricao: z
      .string({ invalid_type_error: 'Descrição deve ser um texto' })
      .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
      .optional()
      .nullable(),
    ativo: z.boolean({ invalid_type_error: 'Ativo deve ser um booleano' }).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

export type AtualizarAtividadeInput = z.infer<typeof atualizarAtividadeSchema>;
