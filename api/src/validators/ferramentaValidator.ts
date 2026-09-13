import { z } from 'zod';

export const listarFerramentasQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(100).optional(),
  status: z.enum(['disponivel', 'em_uso', 'indisponivel']).optional(),
  categoria_id: z.coerce.number().int().positive().optional(),
  grupo_id: z.coerce.number().int().positive().optional(),
  setor_id: z.coerce.number().int().positive().optional(),
  sort: z.string().trim().max(50).optional(),
});

export type ListarFerramentasQuery = z.infer<typeof listarFerramentasQuerySchema>;

export const ferramentaIdParamSchema = z.object({
  id: z.coerce.number().int().positive('ID deve ser um número inteiro positivo'),
});

export const ferramentaCodigoParamSchema = z.object({
  codigo: z.string().trim().min(1, 'Código é obrigatório'),
});

export const criarFerramentaSchema = z.object({
  nome: z.string({ required_error: 'Nome é obrigatório' }).min(2).max(150),
  descricao: z.string().max(2000).optional(),
  marca: z.string().max(100).optional(),
  modelo: z.string().max(100).optional(),
  grupoId: z.coerce.number({ required_error: 'grupoId é obrigatório' }).int().positive(),
  subgrupoId: z.coerce.number().int().positive().optional(),
  setorId: z.coerce.number().int().positive().optional(),
  localizacao: z.string().max(150).optional(),
  ehKit: z.boolean().optional().default(false),
  valorAquisicao: z.coerce.number().positive().optional(),
  fotoUrl: z.string().url('URL da foto inválida').optional(),
});

export type CriarFerramentaInput = z.infer<typeof criarFerramentaSchema>;

