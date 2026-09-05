import { z } from 'zod';

const anoAtual = new Date().getFullYear();

export const listarFeriadosQuerySchema = z.object({
  ano: z.coerce
    .number({ invalid_type_error: 'Ano deve ser numérico' })
    .int('Ano deve ser um número inteiro')
    .min(2000, 'Ano mínimo suportado é 2000')
    .max(anoAtual + 5, `Ano máximo suportado é ${anoAtual + 5}`)
    .optional()
    .default(anoAtual),
});

export type ListarFeriadosQuery = z.infer<typeof listarFeriadosQuerySchema>;

export const verificarDiaUtilQuerySchema = z.object({
  data: z
    .string({ required_error: 'Parâmetro "data" é obrigatório (formato YYYY-MM-DD)' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Parâmetro "data" deve estar no formato YYYY-MM-DD')
    .refine((data) => {
      const ano = Number(data.slice(0, 4));
      return ano >= 2000 && ano <= anoAtual + 5;
    }, `Ano deve estar entre 2000 e ${anoAtual + 5}`),
});

export type VerificarDiaUtilQuery = z.infer<typeof verificarDiaUtilQuerySchema>;
