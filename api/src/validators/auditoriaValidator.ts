import { z } from 'zod';

// Tabelas que têm linha em `auditoria`: as três com trigger (migration 0014) mais colaboradores
// (convite e senha, gravados à mão pelo authService).
export const TABELAS_AUDITADAS = ['ferramentas', 'emprestimos', 'ocorrencias', 'colaboradores'] as const;

const idPositivo = (campo: string) =>
  z.coerce
    .number({ invalid_type_error: `${campo} deve ser um número` })
    .int(`${campo} deve ser um número inteiro`)
    .positive(`${campo} deve ser um número positivo`);

/** AAAA-MM-DD com data de calendário real (2026-02-30 é rejeitada, não corrigida). */
const dataIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'deve estar no formato AAAA-MM-DD')
  .refine((valor) => {
    const [ano, mes, dia] = valor.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
  }, 'não é uma data válida');

// GET /v1/auditoria?tabela=&registroId=&operacao=&usuarioId=&de=&ate=&page=&limit=
export const listarAuditoriaQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    tabela: z
      .enum(TABELAS_AUDITADAS, { errorMap: () => ({ message: `tabela deve ser uma de: ${TABELAS_AUDITADAS.join(', ')}` }) })
      .optional(),
    registroId: idPositivo('registroId').optional(),
    operacao: z.string().trim().min(1).max(20).optional(),
    usuarioId: idPositivo('usuarioId').optional(),
    de: dataIso.optional(),
    ate: dataIso.optional(),
  })
  .superRefine((valor, ctx) => {
    if (valor.de && valor.ate && valor.de > valor.ate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['de'], message: '"de" não pode ser depois de "ate"' });
    }
  });

export type ListarAuditoriaQuery = z.infer<typeof listarAuditoriaQuerySchema>;
