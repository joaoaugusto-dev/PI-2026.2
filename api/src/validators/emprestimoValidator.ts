import { z } from 'zod';

const idPositivo = (campo: string) =>
  z.coerce
    .number({ required_error: `${campo} é obrigatório`, invalid_type_error: `${campo} deve ser um número` })
    .int(`${campo} deve ser um número inteiro`)
    .positive(`${campo} deve ser um número positivo`);

// Data sem horário (YYYY-MM-DD) vale até o fim do expediente daquele dia em
// Brasília; sem isso ela viraria meia-noite UTC (21h do dia anterior no
// Brasil) e a vw_emprestimos_detalhe marcaria o empréstimo como atrasado
// antes da hora.
const SOMENTE_DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const previsaoDevolucaoSchema = z
  .preprocess(
    (valor) => {
      if (typeof valor !== 'string') return valor;
      return new Date(SOMENTE_DATA_REGEX.test(valor) ? `${valor}T23:59:59-03:00` : valor);
    },
    z.date({
      errorMap: (issue, ctx) => ({
        message:
          issue.code === 'invalid_type' && ctx.data === undefined
            ? 'previsaoDevolucao é obrigatória'
            : 'previsaoDevolucao deve ser uma data válida',
      }),
    })
  )
  .refine((data) => data.getTime() > Date.now(), { message: 'previsaoDevolucao não pode estar no passado' });

// usuario_retirada_id não entra aqui de propósito (Regra 6): o schema descarta
// qualquer campo desconhecido enviado no corpo, e o responsável vem do JWT.
// Atividade é opcional (Regra 4).
export const criarEmprestimoSchema = z.object({
  ferramentaId: idPositivo('ferramentaId'),
  itemKitId: idPositivo('itemKitId').optional(),
  colaboradorId: idPositivo('colaboradorId'),
  setorDestinoId: idPositivo('setorDestinoId'),
  atividadeId: idPositivo('atividadeId').optional(),
  atividadeObservacao: z.string().trim().min(1, 'atividadeObservacao não pode ser vazio').max(500).optional(),
  ordemServico: z.string().trim().min(1, 'ordemServico não pode ser vazio').max(50).optional(),
  observacoesRetirada: z.string().trim().min(1, 'observacoesRetirada não pode ser vazio').max(500).optional(),
  previsaoDevolucao: previsaoDevolucaoSchema,
});

export type CriarEmprestimoInput = z.infer<typeof criarEmprestimoSchema>;

// GET /v1/emprestimos/previsao-sugerida?dias= — quantos dias úteis a pessoa
// que retira vai ficar com a ferramenta; o front usa o resultado como valor
// inicial editável. Sem padrão: quem escolhe o prazo é quem retira.
export const previsaoSugeridaQuerySchema = z.object({
  dias: z.coerce
    .number({ required_error: 'dias é obrigatório', invalid_type_error: 'dias deve ser um número' })
    .int('dias deve ser um número inteiro')
    .min(1, 'dias deve ser no mínimo 1')
    .max(30, 'dias deve ser no máximo 30'),
});

export type PrevisaoSugeridaQuery = z.infer<typeof previsaoSugeridaQuerySchema>;
