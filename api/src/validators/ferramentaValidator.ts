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
  id: z.coerce.number().int().positive('ID deve ser um número inteiro positivo'),
});

// codigo_identificacao é SMALLINT entre 1 e 9999 (ver migration 0001).
export const ferramentaCodigoParamSchema = z.object({
  codigo: z.coerce.number().int().min(1).max(9999, 'Código deve estar entre 1 e 9999'),
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

// Mesmos campos editáveis do cadastro (nome, descricao, marca, modelo,
// grupoId, subgrupoId, setorId, localizacao) — status, codigo_identificacao
// e ativo têm rotas/ações próprias (disponibilizar, DELETE) e não são
// editados por aqui.
export const atualizarFerramentaSchema = criarFerramentaSchema
  .partial()
  .refine((dados) => Object.keys(dados).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

export type AtualizarFerramentaInput = z.infer<typeof atualizarFerramentaSchema>;
