import { z } from 'zod';

export const listarFerramentasQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().trim().min(1).max(150).optional(),
  status: z.enum(['disponivel', 'em_uso', 'indisponivel']).optional(),
  // "categoria" é o nome antigo (pré grupos_ferramentas/subgrupos_ferramentas);
  // o filtro passado pelo front chega como grupoId.
  grupoId: z.coerce.number().int().positive().optional(),
  sort: z.enum(['nome', 'status']).optional(),
});

export type ListarFerramentasQuery = z.infer<typeof listarFerramentasQuerySchema>;

export const ferramentaIdParamSchema = z.object({
  id: z.coerce.number({ invalid_type_error: 'ID deve ser um número' }).int('ID deve ser um número inteiro').positive('ID deve ser um número inteiro positivo'),
});

// codigo_identificacao é SMALLINT entre 1 e 9999 (ver migration 0001).
export const ferramentaCodigoParamSchema = z.object({
  codigo: z.coerce.number({ invalid_type_error: 'Código deve ser um número' }).int('Código deve ser um número inteiro').min(1, 'Código deve estar entre 1 e 9999').max(9999, 'Código deve estar entre 1 e 9999'),
});

export const criarFerramentaSchema = z.object({
  nome: z
    .string({ required_error: 'Nome é obrigatório', invalid_type_error: 'Nome deve ser um texto' })
    .trim()
    .min(1, 'Nome não pode ser vazio')
    .max(150, 'Nome deve ter no máximo 150 caracteres'),
  descricao: z.string({ invalid_type_error: 'Descrição deve ser um texto' }).max(2000, 'Descrição deve ter no máximo 2000 caracteres').optional(),
  marca: z.string({ invalid_type_error: 'Marca deve ser um texto' }).max(100, 'Marca deve ter no máximo 100 caracteres').optional(),
  modelo: z.string({ invalid_type_error: 'Modelo deve ser um texto' }).max(100, 'Modelo deve ter no máximo 100 caracteres').optional(),
  grupoId: z.coerce
    .number({ required_error: 'grupoId é obrigatório', invalid_type_error: 'grupoId deve ser um número' })
    .int('grupoId deve ser um número inteiro')
    .positive('grupoId deve ser um número positivo'),
  subgrupoId: z.coerce
    .number({ invalid_type_error: 'subgrupoId deve ser um número' })
    .int('subgrupoId deve ser um número inteiro')
    .positive('subgrupoId deve ser um número positivo')
    .optional(),
  setorId: z.coerce
    .number({ invalid_type_error: 'setorId deve ser um número' })
    .int('setorId deve ser um número inteiro')
    .positive('setorId deve ser um número positivo')
    .optional(),
  localizacao: z.string({ invalid_type_error: 'Localização deve ser um texto' }).max(150, 'Localização deve ter no máximo 150 caracteres').optional(),
  valorAquisicao: z.coerce
    .number({ invalid_type_error: 'Valor de aquisição deve ser um número' })
    .min(0, 'Valor de aquisição não pode ser negativo')
    .optional(),
  ehKit: z.boolean({ invalid_type_error: 'ehKit deve ser um booleano' }).optional(),
});

export type CriarFerramentaInput = z.infer<typeof criarFerramentaSchema>;

export const editarFerramentaSchema = criarFerramentaSchema
  .extend({
    status: z.enum(['disponivel', 'em_uso', 'indisponivel'], {
      errorMap: () => ({ message: 'Status deve ser disponivel, em_uso ou indisponivel' }),
    }).optional(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser fornecido para edição',
  });


export const atualizarFerramentaSchema = editarFerramentaSchema;

export type EditarFerramentaInput = z.infer<typeof editarFerramentaSchema>;

