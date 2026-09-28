import { z } from 'zod';

// Os 5 estados do enum status_ocorrencia (migration 0001). A issue API-13 cita
// só o ciclo aberta → em_reparo → resolvida como critério de pronto, mas o
// time decidiu expor os 5 no PATCH já que o banco já suporta cobrada e baixada.
const STATUS_OCORRENCIA = ['aberta', 'em_reparo', 'cobrada', 'resolvida', 'baixada'] as const;

// tipo não é enum no banco (coluna VARCHAR(50)) — hoje só existe AVARIA e
// PERDA, gravados em maiúsculo pelo trigger fn_abre_ocorrencia (UPPER de
// condicao_devolucao). O filtro aceita as duas grafias.
const TIPO_OCORRENCIA = ['AVARIA', 'PERDA'] as const;

const idPositivo = (campo: string) =>
  z.coerce
    .number({ invalid_type_error: `${campo} deve ser um número` })
    .int(`${campo} deve ser um número inteiro`)
    .positive(`${campo} deve ser um número positivo`);

// GET /v1/ocorrencias?status=&colaboradorId=&tipo=&page=&limit=
export const listarOcorrenciasQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(STATUS_OCORRENCIA, {
    errorMap: () => ({ message: `status deve ser um de: ${STATUS_OCORRENCIA.join(', ')}` }),
  }).optional(),
  colaboradorId: idPositivo('colaboradorId').optional(),
  tipo: z
    .string()
    .trim()
    .min(1)
    .transform((valor) => valor.toUpperCase())
    .pipe(z.enum(TIPO_OCORRENCIA, { errorMap: () => ({ message: `tipo deve ser um de: ${TIPO_OCORRENCIA.join(', ')}` }) }))
    .optional(),
});

export type ListarOcorrenciasQuery = z.infer<typeof listarOcorrenciasQuerySchema>;

export const ocorrenciaIdParamSchema = z.object({
  id: idPositivo('id'),
});

// PATCH /v1/ocorrencias/:id — resolvida_por e data_resolucao não entram aqui
// de propósito (Regra 6): quando status vira 'resolvida' eles são
// preenchidos pelo service a partir do usuário logado (JWT), nunca do corpo
// da requisição. Todos os campos são opcionais, mas ao menos um precisa vir.
export const atualizarOcorrenciaSchema = z
  .object({
    status: z.enum(STATUS_OCORRENCIA, {
      errorMap: () => ({ message: `status deve ser um de: ${STATUS_OCORRENCIA.join(', ')}` }),
    }).optional(),
    custoEstimado: z.coerce
      .number({ invalid_type_error: 'custoEstimado deve ser um número' })
      .nonnegative('custoEstimado não pode ser negativo')
      .optional(),
    observacoesResolucao: z
      .string()
      .trim()
      .min(1, 'observacoesResolucao não pode ser vazio')
      .max(500)
      .optional(),
  })
  .refine((dados) => Object.keys(dados).length > 0, {
    message: 'informe ao menos um campo para atualizar (status, custoEstimado ou observacoesResolucao)',
  });

export type AtualizarOcorrenciaInput = z.infer<typeof atualizarOcorrenciaSchema>;
