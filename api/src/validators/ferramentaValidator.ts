import { z } from 'zod';

export const listarFerramentasQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(['disponivel', 'em_uso', 'indisponivel']).optional(),
});

export type ListarFerramentasQuery = z.infer<typeof listarFerramentasQuerySchema>;

export const ferramentaIdParamSchema = z.object({
  id: z.coerce.number().int().positive('ID deve ser um número inteiro positivo'),
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
});

export type CriarFerramentaInput = z.infer<typeof criarFerramentaSchema>;
