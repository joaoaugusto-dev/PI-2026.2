import { z } from 'zod';

const idPositivo = (campo: string) =>
  z.coerce
    .number({ required_error: `${campo} é obrigatório`, invalid_type_error: `${campo} deve ser um número` })
    .int(`${campo} deve ser um número inteiro`)
    .positive(`${campo} deve ser um número positivo`);

// O usuário pensa em horário de Brasília. Sem tratamento, `new Date()` leria
// "2026-10-05T10:00" (o que um <input type="datetime-local"> envia) no fuso do
// processo, e o servidor em UTC gravaria 07h de Brasília. Por isso texto sem
// offset (sem Z nem ±HH:MM) é interpretado como Brasília (-03:00; o Brasil não
// tem horário de verão desde 2019), inclusive a data sem horário, que vale até
// 23:59:59 do dia: como meia-noite UTC seria 21h do dia anterior, a
// vw_emprestimos_detalhe marcaria o empréstimo como atrasado antes da hora.
const SOMENTE_DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATA_HORA_SEM_OFFSET_REGEX = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)$/;

function interpretarComoBrasilia(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor;
  const texto = valor.trim();
  if (SOMENTE_DATA_REGEX.test(texto)) return new Date(`${texto}T23:59:59-03:00`);
  const dataHora = DATA_HORA_SEM_OFFSET_REGEX.exec(texto);
  if (dataHora) return new Date(`${dataHora[1]}T${dataHora[2]}-03:00`);
  return new Date(texto);
}

const previsaoDevolucaoSchema = z
  .preprocess(
    interpretarComoBrasilia,
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

export const emprestimoIdParamSchema = z.object({
  id: idPositivo('id'),
});

// PATCH /v1/emprestimos/:id/devolucao — usuario_devolucao_id não entra aqui de
// propósito (Regra 6): o responsável vem do JWT e campos desconhecidos são
// descartados. A condição é obrigatória porque é ela que dispara os triggers de
// status da ferramenta e de abertura de ocorrência.
export const devolverEmprestimoSchema = z.object({
  condicaoDevolucao: z.enum(['ok', 'avaria', 'perda'], {
    errorMap: (_issue, ctx) => ({
      message:
        ctx.data === undefined
          ? 'condicaoDevolucao é obrigatória'
          : 'condicaoDevolucao deve ser ok, avaria ou perda',
    }),
  }),
  observacaoDevolucao: z.string().trim().min(1, 'observacaoDevolucao não pode ser vazio').max(500).optional(),
});

export type DevolverEmprestimoInput = z.infer<typeof devolverEmprestimoSchema>;
