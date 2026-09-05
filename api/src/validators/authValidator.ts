import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string({ required_error: 'E-mail é obrigatório' }).email('Formato de e-mail inválido'),
  senha: z.string({ required_error: 'Senha é obrigatória' }).min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const consultaSessaoSchema = z.object({
  identificador: z
    .string({ required_error: 'Matrícula é obrigatória' })
    .min(1, 'Identificador não pode ser vazio')
    .trim(),
});

export type ConsultaSessaoInput = z.infer<typeof consultaSessaoSchema>;
